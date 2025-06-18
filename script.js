// --- Configuration ---
const colorPalette = ['red', 'green', 'blue', 'orange', 'purple', 'brown', 'cyan', 'magenta', 'lime', 'gold'];

let colorIndex = 0;
const semicircleControls = document.getElementById('semicircle-controls');
const addSemicircleBtn = document.getElementById('add-semicircle-btn');
let nyquistTraceIndex = null;


// --- Functions ---
// Function to calculate the impedance and extract real and imaginary parts for different circuits
function calculateImpedance(circuitType, parameters, f) {
    let omega = 2 * Math.PI * f; // Angular frequency
    let real, neg_imag;

    // Handle invalid frequency (f = 0 case)
    if (f === 0 || omega === 0) {
        console.info("Omega is zero, skipping calculation at f = 0.");
        return { real: NaN, neg_imag: NaN };  // Avoid division by zero
    }

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

// Function to init the Nyquist Plot
function initNyquistPlot() {
    let impedance = getCircuitImpedance()
    console.log(impedance)
    if(!impedance){
        return;
    }

    const nyquistTrace = {
        x: impedance.real,
        y: impedance.neg_imag,
        mode: 'lines+markers',
        type: 'scatter',
        name: 'Nyquist Plot',
        uid: 'nyquist'  // Unique ID for updating later
    };

    const layout = {
        title: 'Nyquist Plot',
        xaxis: { title: 'Real Impedance (Ω)' },
        yaxis: { title: '- Imaginary Impedance (Ω)' },
        showlegend: true
    };

    Plotly.newPlot('nyquist-plot', [nyquistTrace], layout).then((plot) => {
        nyquistTraceIndex = 0; // since it's the first trace
    });

    const nyquistTraceFix = {
        x: impedance.real,
        y: impedance.neg_imag,
        mode: 'lines+markers',
        type: 'scatter',
        name: 'Nyquist Plot (Fix Grid)',
        uid: 'fix'  // Unique ID for updating later
    };

    const layout2 = {
        title: 'Nyquist Plot (fixed grid)',
        xaxis: { 
            title: 'Real Impedance (Ω)', 
            range: [0, 0.02],
            scaleanchor: 'y',  // maintain 1:1 aspect ratio with y-axis
            scaleratio: 1
        },
        yaxis: { 
            title: '- Imaginary Impedance (Ω)', 
            range: [0, 0.02] 
        },
        showlegend: false
    };

    Plotly.newPlot('fix-plot', [nyquistTraceFix], layout2);
}

function getCircuitImpedance(){
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
    return { real: impedance.real, neg_imag: impedance.neg_imag };
}

function updateNyquistPlot() {
    const newImpedance = getCircuitImpedance()
    if (!newImpedance ||
    !Array.isArray(newImpedance.real)     ||
    !Array.isArray(newImpedance.neg_imag) ||
    nyquistTraceIndex === null) {
        console.error('updateNyquistPlot > invalid data or plot not ready');
        return;
    }


    if (nyquistTraceIndex !== -1) {
        Plotly.restyle('nyquist-plot', {
            x: [newImpedance.real],
            y: [newImpedance.neg_imag]
        }, [nyquistTraceIndex]);

        Plotly.restyle('fix-plot', {
            x: [newImpedance.real],
            y: [newImpedance.neg_imag]
        }, [nyquistTraceIndex]);
    }
}


// --- Generate semicircle trace ---
function generateSemicircleTrace(centerX, centerY, radius, groupId, color, label) {
    const numPoints = 100;
    const x = [], y = [];

    for (let i = 0; i <= numPoints; i++) {
        const theta = Math.PI * (i / numPoints);
        x.push(centerX + radius * Math.cos(theta));
        y.push(centerY + radius * Math.sin(theta));  // negative for Nyquist lower-half
    }

    return {
        x,
        y,
        mode: 'lines',
        type: 'scatter',
        name: label,
        line: { color: color, width: 2 },
        uid: groupId
    };
}

// --- Plot or update semicircle ---
function plotOrUpdateSemicircle(centerX, centerY, radius, groupId, color, label) {
    const trace = generateSemicircleTrace(centerX, centerY, radius, groupId, color, label);
    const plotDiv = document.getElementById('nyquist-plot');
    const traceIndex = plotDiv.data.findIndex(t => t.uid === groupId);

    if (traceIndex !== -1) {
        Plotly.deleteTraces('nyquist-plot', traceIndex);
        Plotly.deleteTraces('fix-plot', traceIndex);
    }
    Plotly.addTraces('nyquist-plot', trace);
    Plotly.addTraces('fix-plot', trace);

}

// --- Handle input group creation ---
function createSemicircleInputs() {
    const groupId = 'semicircle-' + Date.now();
    const color = colorPalette[colorIndex % colorPalette.length];
    const label = `Semicircle ${colorIndex + 1}`;

    const group = document.createElement('div');
    group.className = 'semicircle-group';
    group.id = groupId;

    group.innerHTML = `
        <div class="controls control-group">
            <label class="form-label">Center X: <input type="number" step="0.001" class="center-x form-control" value="0.001"></label>
            <label class="form-label">Center Y: <input type="number" step="0.001" class="center-y form-control" value="0"></label>
            <label class="form-label">Radius: <input type="number" step="0.001" class="radius form-control" value="0.001"></label>
            <button class="button btn-secondary delete-btn">Delete</button>
        </div>
    `;

    semicircleControls.appendChild(group);

    const centerXInput = group.querySelector('.center-x');
    const centerYInput = group.querySelector('.center-y');
    const radiusInput = group.querySelector('.radius');
    const deleteBtn = group.querySelector('.delete-btn');

    function updateSemicircle() {
        const centerX = parseFloat(centerXInput.value);
        const centerY = parseFloat(centerYInput.value);
        const radius = parseFloat(radiusInput.value);
        plotOrUpdateSemicircle(centerX, centerY, radius, groupId, color, label);
    }

    centerXInput.addEventListener('input', updateSemicircle);
    centerYInput.addEventListener('input', updateSemicircle);
    radiusInput.addEventListener('input', updateSemicircle);

    deleteBtn.addEventListener('click', () => {
        const plotDiv = document.getElementById('nyquist-plot');
        const traceIndex = plotDiv.data.findIndex(t => t.uid === groupId);
        if (traceIndex !== -1) {
            Plotly.deleteTraces('nyquist-plot', traceIndex);
            Plotly.deleteTraces('fix-plot', traceIndex);
        }
        group.remove();
    });

    updateSemicircle();  // Initial draw
    colorIndex++;
}


// Function to synchronize the input field with the slider (when the slider changes)
function syncSlider(elementId) {
    let sliderValue = document.getElementById(elementId).value;
    let inputValue = parseFloat(sliderValue);
    // Update the input field when the slider changes
    document.getElementById(`${elementId}-input`).value = inputValue;
    updateNyquistPlot();  // Update the plot when the slider value changes
}

// Function to synchronize the slider with the input field (when the input field changes)
function syncInputField(elementId) {
    let inputValue = parseFloat(document.getElementById(`${elementId}-input`).value);
    let sliderValue = document.getElementById(elementId);
    if(sliderValue){
        sliderValue.value = inputValue;  // Update the slider position
    }
    
    updateNyquistPlot();  // Update the plot when the input field value changes
}

// Function to select the circuit model based on the clicked image
function selectCircuit(model) {
    // Hide both models and show the selected one
    document.getElementById("Circuit1").style.display = model === 'Circuit1' ? "block" : "none";
    document.getElementById("Circuit2").style.display = model === 'Circuit2' ? "block" : "none";
    document.getElementById("Circuit3").style.display = model === 'Circuit3' ? "block" : "none";
    document.getElementById("Circuit4").style.display = model === 'Circuit4' ? "block" : "none";

    
    initNyquistPlot();  // Re-render the plot with the current values
}

// --- Initialization & Event Listener ---
// Initial plot update
initNyquistPlot();

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

addSemicircleBtn.addEventListener('click', createSemicircleInputs);


