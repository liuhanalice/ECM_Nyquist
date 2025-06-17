import numpy as np

# R0 + (R1 || CPE1)
def circuit1_impedance(params, angular_freq):
    R0_val, R1_val, C1_val, id1_val = params

    ZR0 = R0_val
    ZR1 = R1_val

    ZC1 = 1/(C1_val * np.power(1j*angular_freq, id1_val))
    Z_RC1 = 1/ (1/ZR1 + 1/ZC1)
    Z_total = ZR0 + Z_RC1

    return Z_total

# R0 + (R1 || CPE1) + (R2 || CPE2)
def circuit2_impedance(params, angular_freq):
    R0_val, R1_val, R2_val, C1_val, C2_val, id1_val, id2_val = params

    ZR0 = R0_val
    ZR1 = R1_val
    ZR2 = R2_val


    ZC1 = 1/(C1_val * np.power(1j*angular_freq, id1_val))
    ZC2 = 1/(C2_val * np.power(1j*angular_freq, id2_val))

    Z_RC1 = 1/ (1/ZR1 + 1/ZC1)
    Z_RC2 = 1/ (1/ZR2 + 1/ZC2)

    Z_total = ZR0 + Z_RC1 + Z_RC2

    return Z_total