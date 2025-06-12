// Function to calculate the impedance and extract real and imaginary parts for different circuits
function calculateImpedance(circuitType, parameters, f) {
    let omega = 2 * Math.PI * f; // Angular frequency
    let real, neg_imag;

    // Handle invalid frequency (f = 0 case)
    if (f === 0 || omega === 0) {
        console.info("Omega is zero, skipping calculation at f = 0.");
        return { real: NaN, neg_imag: NaN };  // Avoid division by zero
    }

    // // Check for invalid parameters
    // if (isNaN(R0) || isNaN(R1) || isNaN(C1) || (circuitType === "C2" && isNaN(AW1))) {
    //     console.error("Invalid parameters for circuit:", parameters);
    //     return { real: NaN, imag: NaN };  // Return NaN if any parameter is invalid
    // }

    if (circuitType === "Circuit1") {
        // Model 1: R0 + (R1 || C1)
        let { R0, R1, C1, if1 } = parameters;
        let Z_R1 = math.complex(R1, 0);
        let Z_R0 = math.complex(R0, 0);
        let Q1f = math.complex(0, omega);
        let Z_Q1 = math.divide(1, math.multiply(math.pow(Q1f, if1), C1));
        // let Z_parallel = math.divide(Z_R1, math.add(math.complex(1,0), math.complex(0, R1*C1*math.pow(omega, if1))));
        // let Z_total = math.add(R0, Z_parallel);
        let Z_RC1 = math.divide(1, math.add(math.divide(1, Z_R1), math.divide(1, Z_Q1)));
        let Z_total = math.add(Z_R0,Z_RC1);

        real = math.re(Z_total);
        neg_imag = -math.im(Z_total);
    } else if (circuitType === "Circuit2") {
        // Model 2: R0 + (R1 || C1) + (R2 || C2)
        let { R0, R1, C1, if1, R2, C2, if2 } = parameters;
        let Z_R0 = math.complex(R0, 0);
        let Z_R1 = math.complex(R1, 0);
        let Z_R2 = math.complex(R2, 0);
        
        let Q1f = math.complex(0, omega);
        let Z_Q1 = math.divide(1, math.multiply(math.pow(Q1f, if1), C1));

        let Q2f = math.complex(0, omega);
        let Z_Q2 = math.divide(1, math.multiply(math.pow(Q2f, if2), C2));

        let Z_RC1 = math.divide(1, math.add(math.divide(1, Z_R1), math.divide(1, Z_Q1)));
        let Z_RC2 = math.divide(1, math.add(math.divide(1, Z_R2), math.divide(1, Z_Q2)));

        let Z_total = math.add(Z_R0,Z_RC1,Z_RC2);
        real = math.re(Z_total);
        neg_imag = -math.im(Z_total);
    } else if (circuitType === "Circuit3") {
        let { R0, R1, C1, if1, Aw } = parameters;
        let Z_R0 = math.complex(R0, 0);
        let Z_R1 = math.complex(R1, 0);

        let Q1f = math.complex(0, omega);
        let Z_Q1 = math.divide(1, math.multiply(math.pow(Q1f, if1), C1));

        let Awf = math.complex(0, omega)
        let Z_Aw = math.divide(math.multiply(math.sqrt(2), Aw), math.sqrt(Awf))

        let Z_RAw = math.add(Z_R1, Z_Aw)

        let Z_comp = math.divide(1, math.add(math.divide(1, Z_RAw), math.divide(1, Z_Q1)));
        let Z_total = math.add(Z_R0, Z_comp)

        real = math.re(Z_total);
        neg_imag = -math.im(Z_total);
    } else if (circuitType === "Circuit4") {
        let { R0, R1, C1, if1, R2, C2, if2, Aw } = parameters;
        let Z_R0 = math.complex(R0, 0);
        let Z_R1 = math.complex(R1, 0);
        let Z_R2 = math.complex(R2, 0);

        let Q1f = math.complex(0, omega);
        let Z_Q1 = math.divide(1, math.multiply(math.pow(Q1f, if1), C1));

        let Q2f = math.complex(0, omega);
        let Z_Q2 = math.divide(1, math.multiply(math.pow(Q2f, if2), C2));

        let Awf = math.complex(0, omega)
        let Z_Aw = math.divide(math.multiply(math.sqrt(2), Aw), math.sqrt(Awf))

        let Z_RC1 = math.divide(1, math.add(math.divide(1, Z_R1), math.divide(1, Z_Q1)));
        
        let Z_RAw = math.add(Z_R2, Z_Aw)
        let Z_comp = math.divide(1, math.add(math.divide(1, Z_RAw), math.divide(1, Z_Q2)));

        let Z_total = math.add(Z_R0, Z_RC1, Z_comp)

        real = math.re(Z_total);
        neg_imag = -math.im(Z_total);
    }

    // Check if real or imag are NaN (ensure proper calculation)
    if (isNaN(real) || isNaN(neg_imag)) {
        console.error("Impedance calculation resulted in NaN for real or imaginary parts.");
        return { real: NaN, neg_imag: NaN };
    }

    // console.log("Real:", real, "Imaginary:", imag); 
    return { real: real, neg_imag: neg_imag };
}

// Function to generate sampled impedance data
function nyquistData(circuitType, parameters, freqMin, freqMax, numPoints) {
    let impedanceReal = [];
    let impedanceNegImag = [];
    
    // Calculate the step size based on the number of points
    let freqStep = (freqMax - freqMin) / (numPoints - 1);

    // Generate impedance data for the sampled points
    for (let i = 0; i < numPoints; i++) {
     

        let f = freqMin + i * freqStep; // Current frequency
            
        // Skip f = 0 to avoid division by zero
        if (f === 0) continue;

        let impedance = calculateImpedance(circuitType, parameters, f);

         // Check if impedance values are valid
        if (impedance.real === undefined || impedance.neg_imag === undefined) {
            console.error("Error: Impedance values are undefined at frequency:", f);
        }

        impedanceReal.push(impedance.real);
        impedanceNegImag.push(impedance.neg_imag);
    }

    return { real: impedanceReal, neg_imag: impedanceNegImag };
}

// Function to update the Nyquist plot
function updatePlot() {
    let circuitType = document.querySelector(".model-controls[style*='display: block']");
    
    if (!circuitType) {
        return;
    }
    
    // Create an object to hold the parameter values
    let parameters;
    if (circuitType.id === "Circuit1") {
        parameters = {
            R0: parseFloat(document.getElementById("R0").value),
            R1: parseFloat(document.getElementById("R1").value),
            C1: parseFloat(document.getElementById("C1").value),
            if1: parseFloat(document.getElementById("if1").value),
        };
    }
    else if (circuitType.id === "Circuit2") {
        parameters = {
            R0: parseFloat(document.getElementById("R0_2").value),
            R1: parseFloat(document.getElementById("R1_2").value),
            C1: parseFloat(document.getElementById("C1_2").value),
            if1: parseFloat(document.getElementById("if1_2").value),
            R2: parseFloat(document.getElementById("R2_2").value),
            C2: parseFloat(document.getElementById("C2_2").value),
            if2: parseFloat(document.getElementById("if2_2").value),
        }
    }
     else if (circuitType.id === "Circuit3") {
        parameters = {
            R0: parseFloat(document.getElementById("R0_3").value),
            R1: parseFloat(document.getElementById("R1_3").value),
            C1: parseFloat(document.getElementById("C1_3").value),
            if1: parseFloat(document.getElementById("if1_3").value),
            Aw: parseFloat(document.getElementById("Aw_3").value),
        }
    }
    else if (circuitType.id === "Circuit4") {
        parameters = {
            R0: parseFloat(document.getElementById("R0_4").value),
            R1: parseFloat(document.getElementById("R1_4").value),
            C1: parseFloat(document.getElementById("C1_4").value),
            if1: parseFloat(document.getElementById("if1_4").value),
            R2: parseFloat(document.getElementById("R2_4").value),
            C2: parseFloat(document.getElementById("C2_4").value),
            if2: parseFloat(document.getElementById("if2_4").value),
            Aw: parseFloat(document.getElementById("Aw_4").value),
        }
    }

    let freqMin = parseInt(document.getElementById("freq-min-input").value);
    let freqMax = parseInt(document.getElementById("freq-max-input").value);
    let numPoints = parseInt(document.getElementById("num-points-input").value);

    let impedance = nyquistData(circuitType.id, parameters, freqMin, freqMax, numPoints);

    if (!impedance.real.length || !impedance.neg_imag.length) {
        alert("No impedance data generated. Please check the input parameters.");
        return;
    }

    console.log("Plot Data:", impedance.real, impedance.neg_imag);

    // Clear any existing plot before drawing a new one
    Plotly.purge('nyquist-plot');

    // Debugging logs for impedance values
    console.log("Real Values:", impedance.real);
    console.log("Neg Imaginary Values:", impedance.neg_imag);

    // Ensure that y values are negative imaginary values
    let data = [{
        x: impedance.real,
        y: impedance.neg_imag,//Ensure y is the negative of imaginary values
        mode: 'lines+markers', // Add markers to see sampled points
        type: 'scatter',
        name: 'Nyquist Plot'
    }];

    //  // Get the min and max values of real and imaginary components
    // let realMin = Math.min(...impedance.real);
    // let realMax = Math.max(...impedance.real);
    // let imagMin = Math.min(...impedance.imag);
    // let imagMax = Math.max(...impedance.imag);
   
    // Check the min and max values before proceeding
    // console.log("Real Min:", realMin, "Real Max:", realMax);
    // console.log("Imag Min:", imagMin, "Imag Max:", imagMax);
    // // Find the global min and max for both axes (x and y)
    // let minVal = Math.min(realMin, imagMin);
    // let maxVal = Math.max(realMax, imagMax);

    // Set the range for both axes to the same min and max values
    let layout = {
        title: 'Nyquist Plot',
        xaxis: {
            title: 'Real Impedance (Ω)',
            // range: [minVal, maxVal]  // Set x-axis range to the same as y-axis
        },
        yaxis: {
            title: '- Imaginary Impedance (Ω)',
            // range: [minVal, maxVal]  // Set y-axis range to the same as x-axis
        },
        showlegend: false
    };

    Plotly.newPlot('nyquist-plot', data, layout);
    
    const layout2 = {
      title: 'Nyquist Plot (fixed grid)',
      xaxis: { title: 'Real Impedance (Ω)', range: [0, 0.02] },
      yaxis: { title: '- Imaginary Impedance (Ω)', range: [0, 0.02] },
      showlegend: false
    };

    Plotly.newPlot('alt-plot', data, layout2);
}

// Function to synchronize the input field with the slider (when the slider changes)
function syncSlider(elementId) {
    let sliderValue = document.getElementById(elementId).value;
    let inputValue = parseFloat(sliderValue);
    // Update the input field when the slider changes
    document.getElementById(`${elementId}-input`).value = inputValue;
    updatePlot();  // Update the plot when the slider value changes
}

// Function to synchronize the slider with the input field (when the input field changes)
function syncInputField(elementId) {
    let inputValue = parseFloat(document.getElementById(`${elementId}-input`).value);
    let sliderValue = document.getElementById(elementId);
    if(sliderValue){
        sliderValue.value = inputValue;  // Update the slider position
    }
    
    updatePlot();  // Update the plot when the input field value changes
}

// Function to select the circuit model based on the clicked image
function selectCircuit(model) {
    // Hide both models and show the selected one
    document.getElementById("Circuit1").style.display = model === 'Circuit1' ? "block" : "none";
    document.getElementById("Circuit2").style.display = model === 'Circuit2' ? "block" : "none";
    document.getElementById("Circuit3").style.display = model === 'Circuit3' ? "block" : "none";
    document.getElementById("Circuit4").style.display = model === 'Circuit4' ? "block" : "none";

    
    updatePlot();  // Re-render the plot with the current values
}

// Initial plot update
updatePlot();

// Add event listeners to the input fields
document.querySelectorAll("input[type='number']").forEach((input) => {
    input.addEventListener("input", (event) => {
        let elementId = event.target.id.replace("-input", "");
        syncInputField(elementId);
    });
});

// Add event listeners to the sliders
document.querySelectorAll("input[type='range']").forEach((slider) => {
    slider.addEventListener("input", (event) => {
        let elementId = event.target.id;
        syncSlider(elementId);
    });
});
