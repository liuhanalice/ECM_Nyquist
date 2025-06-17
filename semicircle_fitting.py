import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import least_squares, root_scalar, differential_evolution
from ECM_simulation import *

# === 1. Simulated Nyquist data ===
circuit_type = "Circuit1"
Circuit_params = [0, 0.001, 0.1, 1] # R0, R1, C1, id1

circuit_type = "Circuit2"
Circuit_params = [0, 0.006, 0.03, 0.01, 0.06, 1, 1] # R0, R1, R1, C1, C2, id1, id2

# Define frequency range in Hz
f_min = 0.0001    # Minimum frequency in Hz
f_max = 100000  # Maximum frequency in Hz
num_points = 20000  # Number of points to generate

freq =  np.linspace(f_max, f_min, num=num_points) # reversly 
angular_freq = 2 * np.pi * freq

if circuit_type == "Circuit1":
    Z_total = circuit1_impedance(Circuit_params, angular_freq)
elif circuit_type == "Circuit2":
    Z_total = circuit2_impedance(Circuit_params, angular_freq)

Z_real = np.real(Z_total)
neg_Z_imag = -np.imag(Z_total)


# === 2. Number of semicircles to fit ===
n_circles = 2

# === 3. Parametric semicircle ===
def generate_semicircle(xc, yc, r, num_points=num_points):
    # print("debug", num_points)
    theta = np.linspace(0, np.pi, num_points)
    x = xc + r * np.cos(theta)
    y = yc + r * np.sin(theta)  # upper half
    return x, y

def find_semi_circle_intersection_x_exact(xc1, yc1, r1, xc2, yc2, r2):
    def f(x):
        term1 = np.sqrt(np.clip(r1**2 - (x - xc1)**2, 0, None))
        term2 = np.sqrt(np.clip(r2**2 - (x - xc2)**2, 0, None))
        return (yc1 + term1) - (yc2 + term2)

    left = max(xc1 - r1, xc2 - r2)
    right = min(xc1 + r1, xc2 + r2)
    if left >= right:
        return None
    
    f_left = f(left)
    f_right = f(right)
    # print("debug left", left)
    # print("debug right", right)

    # print("debug f_left", f_left)
    # print("debug f_right", f_right)


    if np.sign(f_left) == np.sign(f_right) or np.isnan(f_left) or np.isnan(f_right):
        # print("⚠️ No sign change between f(left) and f(right)")
        return None  # no zero crossing, so no intersection in bracket
    
    # print("sign change between f(left) and f(right), finding intersection")

    sol = root_scalar(f, bracket=[left, right], method='brentq')
    if sol.converged:
        print(f"Intersection found at x = {sol.root:.6f}")
    return sol.root if sol.converged else None

# === 4. Composite semicircle generation with transition cuts ===
def generate_composite_curve(params, num_points=num_points):
    xs = []
    ys = []

    # Precompute each semicircle
    circles = []
    for i in range(n_circles):
        xc, yc, r = params[i*3 : i*3+3]
        x, y = generate_semicircle(xc, yc, r, num_points)
        circles.append((x, y, xc, yc, r))

    for i in range(n_circles):
        x, y, xc, yc, r = circles[i]

        # First circle: keep everything or cut at intersection
        if i == 0:
            if n_circles > 1:
                _, _, xc2, yc2, r2 = circles[i + 1]
                tx = find_semi_circle_intersection_x_exact(xc, yc, r, xc2, yc2, r2)
                if tx is not None:
                    mask = x < tx
                    xs.extend(x[mask])
                    ys.extend(y[mask])
                    # draw connector later
                    continue
           
            ys.extend(y)

        # Intermediate or last circle
        elif i < n_circles:
            _, _, xc_prev, yc_prev, r_prev = circles[i - 1]
            tx = find_semi_circle_intersection_x_exact(xc_prev, yc_prev, r_prev, xc, yc, r)

            if tx is not None:
                mask = x >= tx
                xs.extend(x[mask])
                ys.extend(y[mask])
            else:
                # If no intersection, insert flat segment
                x_prev, y_prev, *_ = circles[i - 1]
                # xs.extend([x_prev[0], x[-1]])
                # ys.extend([y_prev[0], y[-1]])
                xs.extend(x)
                ys.extend(y)

    return np.array(xs), np.array(ys)

# === 5. Residuals for least squares optimization ===
def residuals(params, x_data, y_data):
    x_fit, y_fit = generate_composite_curve(params)

    if len(x_fit) == 0:
        return np.ones_like(x_data) * 1e6

    # Safe interpolation without sorting
    try:
        interp_y = np.interp(x_data, x_fit, y_fit, left=np.nan, right=np.nan)
    except Exception as e:
        print(f"Interpolation failed: {e}")
        return np.ones_like(x_data) * 1e6

    nan_mask = np.isnan(interp_y)
    if np.any(nan_mask):
        # print(f"⚠️ {np.sum(nan_mask)} NaNs out of {len(interp_y)} interpolated points.")
        interp_y[nan_mask] = 1e6

    return y_data - interp_y

def cost_function(params):
    res = residuals(params, Z_real, neg_Z_imag)
    return np.sum(res**2)

# === 6. Bounds and Initial parameter guess ===
# Format: [xc1, yc1, r1, xc2, yc2, r2, ...]
x_min, x_max = np.min(Z_real), np.max(Z_real)
y_min, y_max = np.min(neg_Z_imag), np.max(neg_Z_imag)
span_x = x_max - x_min
span_y = y_max - y_min

bounds = []
for _ in range(n_circles):
    bounds.extend([
        (x_min, x_max + 0.2 * span_x),   # xc
        (y_min, y_max + 0.2 * span_y),   # yc
        (x_min, span_x)        # radius
    ])

# initial parameters
# if n_circles == 1:
#     x_centers = [0.5 * (x_min + x_max)]  # midpoint
# else:
#     bin_edges = np.linspace(x_min, x_max, n_circles + 1 + 1)  # n+1 bins = n+2 edges
#     x_centers = [(bin_edges[i] + bin_edges[i+1]) / 2 for i in range(1, n_circles + 1)]

# initial_params = []
# for xc in x_centers:
#     initial_params.extend([
#         xc,
#         0.1 * span_y,         # yc (lift it)
#         0.6 * span_x / n_circles   # r: big enough to cover
#     ])

# print(initial_params)


# === 8. Run optimizer ===
result = differential_evolution(
    cost_function,
    bounds,
    strategy='best1bin',
    maxiter=1000,
    popsize=15,
    tol=1e-6,
    mutation=(0.5, 1),
    recombination=0.7,
    seed=42,
    disp=True,
    polish=True  # Optionally refine result using local search
)
fitted_params = result.x

print(fitted_params)

# === 9. Print fitted parameters ===
for i in range(n_circles):
    xc, yc, r = fitted_params[i*3 : i*3+3]
    print(f"Semicircle {i+1}: center=({xc}, {yc}), radius={r}")

# === 10. Plot result ===
x_fit, y_fit = generate_composite_curve(fitted_params)
plt.figure(figsize=(8, 6))
plt.plot(Z_real, neg_Z_imag, 'ko', label='Measured Data')
plt.plot(x_fit, y_fit, 'r-', label=f'Fitted ({n_circles} semicircle{"s" if n_circles > 1 else ""})')
# for i in range(n_circles):
#     xc, yc, r = fitted_params[i*3 : i*3+3]
#     x, y = generate_semicircle(xc,yc,r)
#     plt.plot(x, y, label=f"Fitted semicircle {i+1}")
plt.scatter(x_fit, y_fit, c='red', s=5)  # for debug visibility
plt.xlabel('Real(Z)')
plt.ylabel('-Imag(Z)')
plt.title('Nyquist Semicircle Fit')
plt.axis('equal')
plt.grid(True)
plt.legend()
plt.tight_layout()
plt.show()


