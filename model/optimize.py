#!/usr/bin/env python3
"""Energetski utrip šole – simulated PV/BESS/kitchen model and MILP scheduler.

Generates data.js, the pre-computed scenario file imported by the portal.
All input profiles are SYNTHETIC (a generic school); replace the functions in
"Input profiles" with PVGIS / metered data when they become available.

Run:  python3 model/optimize.py          (requires numpy, scipy >= 1.9)
"""
import json
import math
import pathlib
import random

import numpy as np
from scipy.optimize import Bounds, LinearConstraint, milp
from scipy.sparse import lil_matrix

T = 96
DT = 0.25  # h

# ---- System parameters (assumptions) --------------------------------------
PV_KWP = 100
ETA_CH = ETA_DIS = 0.95
SOC_MIN, SOC_MAX = 0.10, 0.95
C_RATE = 0.5  # max charge/discharge power as a share of capacity per hour
PRICE_HIGH, PRICE_LOW = 0.16, 0.11  # EUR/kWh, 06-22 h / otherwise
FEED_IN = 0.05  # EUR/kWh
GRID_LIMIT = 120  # kW
FLEX_KITCHEN_LIMIT = 30  # kW, shiftable kitchen appliances running at once
EPS_MOVE = 0.002  # EUR per 15-min of shift: do not move a task without benefit

WEATHERS = {
    "sunny": {"label": "Sončno", "peak": 0.76, "noise": 0.015, "seed": 11},
    "partly": {"label": "Delno oblačno", "peak": 0.58, "noise": 0.24, "seed": 23},
    "cloudy": {"label": "Oblačno", "peak": 0.17, "noise": 0.08, "seed": 37},
}
CAPACITIES = [0, 50, 100, 200]  # kWh


def slot(hhmm):
    h, m = hhmm.split(":")
    return int(h) * 4 + int(m) // 15


# earliest / latest are allowed START times; default is today's habit.
TASKS = [
    {"id": "bake", "name": "Peka peciva za malico", "device": "Konvektomat",
     "power": 14, "dur": 5, "default": "06:00", "earliest": "06:00", "latest": "08:15",
     "why": "Pecivo mora biti pripravljeno do 9.30."},
    {"id": "cook", "name": "Kuhanje kosila", "device": "Električni kotel",
     "power": 18, "dur": 6, "default": "08:30", "earliest": "08:00", "latest": "10:15",
     "why": "Kosilo mora biti skuhano do 11.45."},
    {"id": "dish", "name": "Pomivanje po kosilu", "device": "Pomivalni stroj",
     "power": 12, "dur": 6, "default": "15:30", "earliest": "13:30", "latest": "16:30",
     "why": "Posoda je na voljo šele od 13.30, delo se konča do 18.00."},
    {"id": "cool", "name": "Predhlajenje hladilnice", "device": "Hladilna komora",
     "power": 6, "dur": 12, "default": "16:30", "earliest": "10:00", "latest": "17:00",
     "why": "Hladilnica mora biti ohlajena pred večerom."},
    {"id": "wash", "name": "Pranje kuhinjskih tekstilij", "device": "Pralni stroj",
     "power": 5, "dur": 4, "default": "17:00", "earliest": "12:00", "latest": "18:00",
     "why": "Pranje se začne po pripravi kosila."},
]
for t in TASKS:
    t["s_default"], t["s_min"], t["s_max"] = slot(t["default"]), slot(t["earliest"]), slot(t["latest"])


# ---- Input profiles (synthetic) --------------------------------------------
def pv_profile(w):
    """Spring day: sunrise 06:15, sunset 19:45, smoothed random cloud cover."""
    cfg = WEATHERS[w]
    rng = random.Random(cfg["seed"])
    cloud, out = 0.0, []
    for t in range(T):
        h = (t + 0.5) * DT
        s = math.sin(math.pi * (h - 6.25) / 13.5) if 6.25 < h < 19.75 else 0
        cloud = 0.8 * cloud + 0.2 * rng.gauss(0, 1)
        factor = max(0.15, min(1.15, 1 + cfg["noise"] * cloud * 2.2))
        out.append(PV_KWP * cfg["peak"] * s ** 1.25 * factor)
    return np.array(out)


def base_profile():
    """Whole-school load without the kitchen."""
    points = [(0, 9), (6, 9), (7, 18), (8, 40), (10, 44), (12.5, 42), (14, 34),
              (15.5, 24), (17, 15), (18, 16), (21, 13), (22, 9), (24, 9)]
    rng = random.Random(5)
    return np.array([np.interp((t + 0.5) * DT, *zip(*points)) * (1 + rng.gauss(0, 0.025))
                     for t in range(T)])


def kitchen_fixed():
    """Kitchen load that cannot move (snack preparation, keeping lunch warm)."""
    k = np.zeros(T)
    k[slot("07:30"):slot("09:30")] = 8
    k[slot("11:30"):slot("14:00")] = 6
    return k


def task_profile(starts):
    k = np.zeros(T)
    for task, s in zip(TASKS, starts):
        k[s:s + task["dur"]] += task["power"]
    return k


def prices():
    return np.array([PRICE_HIGH if 24 <= t < 88 else PRICE_LOW for t in range(T)])


# ---- Rule-based baseline ---------------------------------------------------
def simulate_rule(pv, load, cap):
    """Charge from surplus, discharge on deficit. Repeated until the day is periodic."""
    e = 0.5 * cap
    for _ in range(30):
        start = e
        res = {k: np.zeros(T) for k in ("pl", "pb", "pe", "bl", "gl", "soc")}
        for t in range(T):
            direct = min(pv[t], load[t])
            surplus, deficit = pv[t] - direct, load[t] - direct
            charge = min(surplus, C_RATE * cap, max(0.0, (SOC_MAX * cap - e) / (ETA_CH * DT))) if cap else 0.0
            dis = min(deficit, C_RATE * cap, max(0.0, (e - SOC_MIN * cap) * ETA_DIS / DT)) if cap else 0.0
            e += charge * ETA_CH * DT - dis * DT / ETA_DIS
            res["pl"][t], res["pb"][t], res["pe"][t] = direct, charge, surplus - charge
            res["bl"][t], res["gl"][t] = dis, deficit - dis
            res["soc"][t] = 100 * e / cap if cap else 0
        if abs(e - start) < 1e-3:
            break
    return res


# ---- MILP --------------------------------------------------------------------
def solve_milp(pv, base_fixed, cap, shift):
    """min grid cost - export revenue, subject to balance, BESS and kitchen limits."""
    price = prices()
    nx = 7  # pl, pb, pe, bl, gl, soc_kWh, y
    n_cont = nx * T
    xindex, offset = [], n_cont
    for task in TASKS:
        starts = range(task["s_min"], task["s_max"] + 1) if shift else [task["s_default"]]
        xindex.append({s: offset + i for i, s in enumerate(starts)})
        offset += len(starts)
    n = offset

    def v(name, t):
        return "pl pb pe bl gl e y".split().index(name) * T + t

    c = np.zeros(n)
    lb, ub = np.zeros(n), np.full(n, np.inf)
    integrality = np.zeros(n)
    pmax = C_RATE * cap
    for t in range(T):
        c[v("gl", t)] = price[t] * DT
        c[v("pe", t)] = -FEED_IN * DT
        lb[v("e", t)], ub[v("e", t)] = SOC_MIN * cap, SOC_MAX * cap
        ub[v("pb", t)] = ub[v("bl", t)] = pmax
        ub[v("gl", t)] = GRID_LIMIT
        ub[v("y", t)] = 1
        integrality[v("y", t)] = 1
    for task, xs in zip(TASKS, xindex):
        for s, i in xs.items():
            ub[i], integrality[i] = 1, 1
            c[i] = EPS_MOVE * abs(s - task["s_default"])

    rows = 4 * T + T + T + len(TASKS)
    A = lil_matrix((rows, n))
    lo, hi = np.zeros(rows), np.zeros(rows)
    r = 0
    for t in range(T):
        # PV split
        A[r, v("pl", t)] = A[r, v("pb", t)] = A[r, v("pe", t)] = 1
        lo[r] = hi[r] = pv[t]; r += 1
        # Load balance
        A[r, v("pl", t)] = A[r, v("bl", t)] = A[r, v("gl", t)] = 1
        for task, xs in zip(TASKS, xindex):
            for s, i in xs.items():
                if s <= t < s + task["dur"]:
                    A[r, i] = -task["power"]
        lo[r] = hi[r] = base_fixed[t]; r += 1
        # SOC dynamics, cyclic day so the battery cannot be drained for free
        A[r, v("e", (t + 1) % T)] = 1
        A[r, v("e", t)] = -1
        A[r, v("pb", t)] = -ETA_CH * DT
        A[r, v("bl", t)] = DT / ETA_DIS
        r += 1
        # No simultaneous charging and discharging
        A[r, v("pb", t)] = 1
        A[r, v("y", t)] = -pmax
        lo[r], hi[r] = -np.inf, 0; r += 1
        A[r, v("bl", t)] = 1
        A[r, v("y", t)] = pmax
        lo[r], hi[r] = -np.inf, pmax; r += 1
        # Shiftable kitchen appliances running at once
        for task, xs in zip(TASKS, xindex):
            for s, i in xs.items():
                if s <= t < s + task["dur"]:
                    A[r, i] = task["power"]
        lo[r], hi[r] = -np.inf, FLEX_KITCHEN_LIMIT; r += 1
    for xs in xindex:  # every task runs exactly once
        for i in xs.values():
            A[r, i] = 1
        lo[r] = hi[r] = 1; r += 1

    res = milp(c, integrality=integrality, bounds=Bounds(lb, ub),
               constraints=LinearConstraint(A.tocsr(), lo, hi),
               options={"time_limit": 60, "mip_rel_gap": 1e-4})
    if res.x is None:
        raise RuntimeError(f"MILP infeasible: {res.message}")
    x = res.x
    starts = [max(xs, key=lambda s: x[xs[s]]) for xs in xindex]
    out = {k: np.array([x[v(k, t)] for t in range(T)]) for k in ("pl", "pb", "pe", "bl", "gl")}
    out["soc"] = np.array([100 * x[v("e", t)] / cap if cap else 0 for t in range(T)])
    return out, starts, res.status


def kpis(pv, load, r):
    price = prices()
    grid = r["gl"].sum() * DT
    used = load.sum() * DT
    prod = pv.sum() * DT
    export = r["pe"].sum() * DT
    return {
        "self_suff": round(100 * (1 - grid / used), 1),
        "self_cons": round(100 * (1 - export / prod), 1),
        "grid": round(grid, 1),
        "export": round(export, 1),
        "pv": round(prod, 1),
        "load": round(used, 1),
        "cost": round(float((r["gl"] * price).sum() * DT - export * FEED_IN), 2),
    }


def pack(pv, base, kitchen, r, starts):
    load = base + kitchen
    balance = np.abs(r["pl"] + r["bl"] + r["gl"] - load).max()
    assert balance < 1e-4, f"load balance violated by {balance}"
    assert np.abs(r["pl"] + r["pb"] + r["pe"] - pv).max() < 1e-4
    assert not np.any((r["pb"] > 1e-4) & (r["bl"] > 1e-4)), "simultaneous charge/discharge"
    series = {k: [round(float(x), 2) for x in r[k]] for k in ("pl", "pb", "pe", "bl", "gl", "soc")}
    series["kit"] = [round(float(x), 2) for x in kitchen]
    return {"series": series, "starts": starts, "kpi": kpis(pv, load, r)}


def main():
    base = base_profile()
    fixed = kitchen_fixed()
    default_starts = [t["s_default"] for t in TASKS]
    default_kitchen = fixed + task_profile(default_starts)
    scenarios = {}
    for w in WEATHERS:
        pv = pv_profile(w)
        scenarios[w] = {"pv": [round(float(x), 2) for x in pv], "byCap": {}}
        for cap in CAPACITIES:
            rule = simulate_rule(pv, base + default_kitchen, cap)
            fixed_opt, s1, st1 = solve_milp(pv, base + fixed, cap, False)
            shift_opt, s2, st2 = solve_milp(pv, base + fixed, cap, True)
            kitchen2 = fixed + task_profile(s2)
            scenarios[w]["byCap"][cap] = {
                "base": pack(pv, base, default_kitchen, rule, default_starts),
                "milpFixed": pack(pv, base, default_kitchen, fixed_opt, s1),
                "milpShift": pack(pv, base, kitchen2, shift_opt, s2),
            }
            b, m = scenarios[w]["byCap"][cap]["base"]["kpi"], scenarios[w]["byCap"][cap]["milpShift"]["kpi"]
            print(f"{w:7s} {cap:4d} kWh | base SS {b['self_suff']:5.1f}% SC {b['self_cons']:5.1f}% "
                  f"{b['cost']:6.2f} EUR | MILP SS {m['self_suff']:5.1f}% SC {m['self_cons']:5.1f}% "
                  f"{m['cost']:6.2f} EUR | status {st1},{st2} | starts {s2}")

    data = {
        "meta": {
            "steps": T, "dt": DT, "pvKwp": PV_KWP, "capacities": CAPACITIES,
            "socMin": SOC_MIN * 100, "socMax": SOC_MAX * 100, "etaCh": ETA_CH, "etaDis": ETA_DIS,
            "cRate": C_RATE, "priceHigh": PRICE_HIGH, "priceLow": PRICE_LOW, "feedIn": FEED_IN,
            "flexLimit": FLEX_KITCHEN_LIMIT, "gridLimit": GRID_LIMIT,
            "weathers": {k: v["label"] for k, v in WEATHERS.items()},
        },
        "base": [round(float(x), 2) for x in base],
        "tasks": [{k: t[k] for k in ("id", "name", "device", "power", "dur", "why", "s_default", "s_min", "s_max")}
                  for t in TASKS],
        "scenarios": scenarios,
    }
    out = pathlib.Path(__file__).resolve().parent.parent / "data.js"
    out.write_text("// Generated by model/optimize.py – simulated data\nwindow.ENERGY_DATA=" +
                   json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";\n", encoding="utf-8")
    print(f"Wrote {out} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
