document.addEventListener('DOMContentLoaded', () => {
    let state = {};
    const colors = { A: '#0077b6', B: '#f77f00', C: '#55a630', D: '#8031a7' };
    const colorKeys = Object.keys(colors);
    
    let manualModeActiveTime = null; // Rastrea la fila activa en modo manual

    let audioCtx;
    function playBeep() {
        if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { console.error("Web Audio API no es soportada en este navegador.", e); return; } }
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    }

    const perfilIdeal = {
        "Equilibrio": { 
            nombreFase: "Fase de Equilibrio (Turning Point)",
            tiempoAcumuladoMin: 50, tiempoAcumuladoMax: 75,
            tempObjetivoMin: 90, tempObjetivoMax: 95,
            rorMedioMin: 15, rorMedioMax: 24,
            gasRecomendado: { min: 25, max: 35 },
            aireRecomendado: { min: 0, max: 25 },
            soluciones: {
                rorBajo: (val) => `RoR Bajo: Tu RoR fue de <strong>${val.toFixed(1)}°C/min</strong>, por debajo del objetivo de ${perfilIdeal.Equilibrio.rorMedioMin}°C/min. Esto indica que el tueste podría estancarse. <strong>ACCIÓN (Próximo Lote):</strong> Considera una temperatura de carga mayor o más potencia inicial.`,
                rorAlto: (val) => `RoR Alto: Tu RoR fue de <strong>${val.toFixed(1)}°C/min</strong>, por encima del pico de ${perfilIdeal.Equilibrio.rorMedioMax}°C/min. Podrías estar aplicando demasiado calor inicial. <strong>ACCIÓN (Próximo Lote):</strong> Reduce la potencia de carga.`,
                tiempoLargo: (val) => `Giro Tardío: Ocurrió en <strong>${formatTime(val)}</strong>, más tarde del objetivo (${formatTime(perfilIdeal.Equilibrio.tiempoAcumuladoMin)}-${formatTime(perfilIdeal.Equilibrio.tiempoAcumuladoMax)}). Esto sugiere falta de energía inicial, lo que puede resultar en un café "plano". <strong>ACCIÓN (Próximo Lote):</strong> Aumenta la potencia de carga.`,
                tempFueraDeRango: (val) => `Temp. de Giro Fuera de Rango: Fue de <strong>${val.toFixed(1)}°C</strong>, fuera del rango objetivo (${perfilIdeal.Equilibrio.tempObjetivoMin}-${perfilIdeal.Equilibrio.tempObjetivoMax}°C). Esto afecta toda la curva posterior. <strong>ACCIÓN (Próximo Lote):</strong> Ajusta la temperatura de carga.`,
                gasBajo: (val) => `Gas Bajo: Tu ajuste de <strong>${val} mbar</strong> está por debajo del rango recomendado (${perfilIdeal.Equilibrio.gasRecomendado.min}-${perfilIdeal.Equilibrio.gasRecomendado.max} mbar) para esta fase.`,
                gasAlto: (val) => `Gas Alto: Tu ajuste de <strong>${val} mbar</strong> está por encima del rango recomendado (${perfilIdeal.Equilibrio.gasRecomendado.min}-${perfilIdeal.Equilibrio.gasRecomendado.max} mbar) para esta fase.`,
                aireBajo: (val) => `Aire Bajo: Tu ajuste de <strong>${val}%</strong> está por debajo del rango recomendado (${perfilIdeal.Equilibrio.aireRecomendado.min}-${perfilIdeal.Equilibrio.aireRecomendado.max}%) para esta fase.`,
                aireAlto: (val) => `Aire Alto: Tu ajuste de <strong>${val}%</strong> está por encima del rango recomendado (${perfilIdeal.Equilibrio.aireRecomendado.min}-${perfilIdeal.Equilibrio.aireRecomendado.max}%) para esta fase.`,
            }
        },
        "Amarillo": { 
            nombreFase: "Fase Amarilla (Secado)",
            tiempoAcumuladoMin: 240, tiempoAcumuladoMax: 300,
            rorMedioMin: 10, rorMedioMax: 12,
            gasRecomendado: { min: 18, max: 25 },
            aireRecomendado: { min: 25, max: 50 },
            soluciones: {
                rorBajo: (val) => `RoR Bajo: Tu RoR fue de <strong>${val.toFixed(1)}°C/min</strong>, por debajo del rango de ${perfilIdeal.Amarillo.rorMedioMin}-${perfilIdeal.Amarillo.rorMedioMax}°C/min. <strong>RIESGO:</strong> El tueste se está aplanando (crash). <strong>ACCIÓN:</strong> Aumenta la potencia para mantener la inercia.`,
                rorAlto: (val) => `RoR Alto: Tu RoR fue de <strong>${val.toFixed(1)}°C/min</strong>, por encima del rango de ${perfilIdeal.Amarillo.rorMedioMin}-${perfilIdeal.Amarillo.rorMedioMax}°C/min. <strong>RIESGO:</strong> Cocción externa muy rápida. <strong>ACCIÓN:</strong> Reduce la potencia de gas suavemente.`,
                tiempoLargo: (val) => `Secado Largo: Llegaste a la fase amarilla en <strong>${formatTime(val)}</strong>, más tarde del objetivo (${formatTime(perfilIdeal.Amarillo.tiempoAcumuladoMin)}-${formatTime(perfilIdeal.Amarillo.tiempoAcumuladoMax)}). <strong>RIESGO:</strong> Café con sabor "horneado" (baked). <strong>ACCIÓN (Próximo Lote):</strong> Aplica más energía antes.`,
                gasBajo: (val) => `Gas Bajo: Tu ajuste de <strong>${val} mbar</strong> está por debajo del rango recomendado (${perfilIdeal.Amarillo.gasRecomendado.min}-${perfilIdeal.Amarillo.gasRecomendado.max} mbar) para esta fase.`,
                gasAlto: (val) => `Gas Alto: Tu ajuste de <strong>${val} mbar</strong> está por encima del rango recomendado (${perfilIdeal.Amarillo.gasRecomendado.min}-${perfilIdeal.Amarillo.gasRecomendado.max} mbar) para esta fase.`,
                aireBajo: (val) => `Aire Bajo: Tu ajuste de <strong>${val}%</strong> está por debajo del rango recomendado (${perfilIdeal.Amarillo.aireRecomendado.min}-${perfilIdeal.Amarillo.aireRecomendado.max}%) para esta fase.`,
                aireAlto: (val) => `Aire Alto: Tu ajuste de <strong>${val}%</strong> está por encima del rango recomendado (${perfilIdeal.Amarillo.aireRecomendado.min}-${perfilIdeal.Amarillo.aireRecomendado.max}%) para esta fase.`,
            }
        },
        "Primer Crack": {
            nombreFase: "Reacción de Maillard (hacia 1C)",
            tiempoAcumuladoMin: 540, tiempoAcumuladoMax: 630,
            rorMedioMin: 5, rorMedioMax: 7,
            gasRecomendado: { min: 10, max: 18 },
            aireRecomendado: { min: 50, max: 75 },
            soluciones: {
                rorBajo: (val) => `RoR Bajo: Tu RoR fue de <strong>${val.toFixed(1)}°C/min</strong>, por debajo del objetivo de ${perfilIdeal["Primer Crack"].rorMedioMin}-${perfilIdeal["Primer Crack"].rorMedioMax}°C/min. <strong>RIESGO:</strong> El tueste se está deteniendo (stall). <strong>ACCIÓN:</strong> Aumenta ligeramente la potencia y/o reduce el aire.`,
                rorAlto: (val) => `RoR Alto: Tu RoR fue de <strong>${val.toFixed(1)}°C/min</strong>, por encima del objetivo de ${perfilIdeal["Primer Crack"].rorMedioMin}-${perfilIdeal["Primer Crack"].rorMedioMax}°C/min. <strong>RIESGO:</strong> Reacción demasiado violenta (flicks). <strong>ACCIÓN:</strong> Reduce la potencia y/o aumenta el aire.`,
                tiempoLargo: (val) => `Maillard Largo: Llegaste al 1er Crack en <strong>${formatTime(val)}</strong>, más tarde del objetivo (${formatTime(perfilIdeal["Primer Crack"].tiempoAcumuladoMin)}-${formatTime(perfilIdeal["Primer Crack"].tiempoAcumuladoMax)}). <strong>RIESGO:</strong> Pérdida de complejidad. <strong>ACCIÓN (Próximo Lote):</strong> Revisa la energía en la fase amarilla.`,
                gasBajo: (val) => `Gas Bajo: Tu ajuste de <strong>${val} mbar</strong> está por debajo del rango recomendado (${perfilIdeal["Primer Crack"].gasRecomendado.min}-${perfilIdeal["Primer Crack"].gasRecomendado.max} mbar) para esta fase.`,
                gasAlto: (val) => `Gas Alto: Tu ajuste de <strong>${val} mbar</strong> está por encima del rango recomendado (${perfilIdeal["Primer Crack"].gasRecomendado.min}-${perfilIdeal["Primer Crack"].gasRecomendado.max} mbar) para esta fase.`,
                aireBajo: (val) => `Aire Bajo: Tu ajuste de <strong>${val}%</strong> está por debajo del rango recomendado (${perfilIdeal["Primer Crack"].aireRecomendado.min}-${perfilIdeal["Primer Crack"].aireRecomendado.max}%) para esta fase.`,
                aireAlto: (val) => `Aire Alto: Tu ajuste de <strong>${val}%</strong> está por encima del rango recomendado (${perfilIdeal["Primer Crack"].aireRecomendado.min}-${perfilIdeal["Primer Crack"].aireRecomendado.max}%) para esta fase.`,
            }
        }
    };

    const allDOMElements = {
        body: document.body, eventButtons: document.querySelectorAll('.event-button'),
        tabButtonsContainer: document.getElementById('tab-buttons-container'), addSampleBtn: document.getElementById('add-sample-btn'),
        infoPanelsContainer: document.getElementById('info-panels-container'), timerDisplay: document.getElementById('timer-display'),
        startBtn: document.getElementById('start-btn'), stopBtn: document.getElementById('stop-btn'), resetBtn: document.getElementById('reset-btn'),
        globalResetBtn: document.getElementById('global-reset-btn'), dataLogBody: document.getElementById('data-log-body'),
        chartCanvas: document.getElementById('roast-chart'), openReportChoicesBtn: document.getElementById('open-report-choices-btn'),
        reportModal: document.getElementById('report-modal'), reportTitle: document.getElementById('report-title'), reportButtonsContainer: document.getElementById('report-buttons-container'), reportBody: document.getElementById('report-body'),
        eventModal: document.getElementById('event-modal'), eventModalTitle: document.getElementById('event-modal-title'),
        eventTimeInput: document.getElementById('event-time-input'), eventTempInput: document.getElementById('event-temp-input'),
        saveEventBtn: document.getElementById('save-event-btn'), cancelEventBtn: document.getElementById('cancel-event-btn'),
        modeSwitch: document.getElementById('mode-switch'), dataLogTitle: document.getElementById('data-log-title'),
        reportChoiceModal: document.getElementById('report-choice-modal'), reportChoiceBody: document.getElementById('report-choice-body'),
        closeChoiceModal: document.getElementById('close-choice-modal'),
        profileImportInput: document.getElementById('profile-import-input'), importProfileBtn: document.getElementById('import-profile-btn'),
        csvImportInput: document.getElementById('csv-import-input'), importCsvBtn: document.getElementById('import-csv-btn'),
        addRowBtn: document.getElementById('add-row-btn'),
        saveSessionBtn: document.getElementById('save-session-btn'), openSessionBtn: document.getElementById('open-session-btn'),
        sessionImportInput: document.getElementById('session-import-input'),
        openSimulationBtn: document.getElementById('open-simulation-btn'),
        simulationModal: document.getElementById('simulation-modal'),
        closeSimulationModal: document.getElementById('close-simulation-modal'),
        simSampleChoices: document.getElementById('simulation-sample-choices'),
        simTimer: document.getElementById('sim-timer'),
        simPlayPauseBtn: document.getElementById('sim-play-pause-btn'),
        simResetBtn: document.getElementById('sim-reset-btn'),
        simChartCanvas: document.getElementById('simulation-chart'),
        speedControls: document.getElementById('speed-controls'),
        avisosContainer: document.getElementById('avisos-container'),
        simProgressBar: document.getElementById('sim-progress-bar'),
        simAvisosContainer: document.getElementById('sim-avisos-container'),
        exportAvisosBtn: document.getElementById('export-avisos-btn'),
        gasSlider: document.getElementById('gas-slider'),
        gasValueDisplay: document.getElementById('gas-value-display'),
        airSelect: document.getElementById('air-select'),
    };
    let roastChart, simulationChart;
    let currentEventToSave = null;
    let timerInterval = null, simulationInterval = null;
    let simulationState = {};

    const eventNames = { turning_point: 'Equilibrio', yellow: 'Amarillo', crack: '1er Crack', end: 'Fin' };
    const eventOrder = ['turning_point', 'yellow', 'crack', 'end'];
    const pointIcons = { turning_point: 'rectRot', yellow: 'star', crack: 'triangle', end: 'crossRot' };
    const eventKeyToCssClass = { turning_point: 'event-row-tp', yellow: 'event-row-yellow', crack: 'event-row-crack', end: 'event-row-end' };
    
    const LOG_INTERVAL = 30;
    const INITIAL_VISIBLE_TIME = 13 * 60;
    const MAX_LOG_TIME = 20 * 60;

    function getSampleColor(sampleId) { const charCodeA = 'A'.charCodeAt(0); const charCodeCurrent = sampleId.charCodeAt(0); const colorIndex = (charCodeCurrent - charCodeA) % colorKeys.length; const colorKey = colorKeys[colorIndex]; return colors[colorKey]; }
    function createEmptySample() { return { data: [], events: {}, info: {}, adjustments: [], maxRoR: {value: -Infinity}, isTicking: false, elapsedSeconds: 0, startTime: null, asistenteAvisos: [] }; }
    function getInitialState() { const samples = { A: createEmptySample(), B: createEmptySample(), C: createEmptySample(), D: createEmptySample() }; return { currentSample: 'A', mode: 'live', samples }; }
    
    function exportarAvisos() {
        const sample = state.samples[state.currentSample];
        const avisos = analizarPerfilCompleto(sample);
        if (avisos.length === 0) { alert('No hay observaciones del asistente para exportar en este tueste.'); return; }
        let fileContent = `Historial de Observaciones del Asistente para la Muestra ${state.currentSample}\n====================================================================\n\n`;
        const limpiarHtml = (html) => { const div = document.createElement('div'); div.innerHTML = html; return div.textContent || div.innerText || ""; };
        avisos.forEach(aviso => { fileContent += `[${aviso.fase}] - [${aviso.tipo.toUpperCase()}]\n${limpiarHtml(aviso.texto)}\n\n`; });
        const blob = new Blob([fileContent], {type: "text/plain;charset=utf-8"});
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Historial_Asistente_Muestra_${state.currentSample}.txt`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    function closeSimulationModal() { clearInterval(simulationInterval); simulationInterval = null; allDOMElements.simulationModal.classList.remove('visible'); }
    function openSimulationModal() { allDOMElements.simSampleChoices.innerHTML = ''; const samplesWithData = Object.keys(state.samples).filter(id => state.samples[id].data.filter(d => d.temp !== null).length > 0); if (samplesWithData.length === 0) { allDOMElements.simSampleChoices.innerHTML = '<p>No hay tuestes con datos para simular.</p>'; } else { samplesWithData.forEach(id => { const choice = document.createElement('label'); const color = getSampleColor(id); choice.style.border = `2px solid ${color}`; choice.innerHTML = `<input type="checkbox" data-sample-id="${id}" checked> Muestra ${id}`; allDOMElements.simSampleChoices.appendChild(choice); }); } setupSimulationChart(); resetSimulation(); allDOMElements.simulationModal.classList.add('visible'); }
    
    function addEventListeners() {
        allDOMElements.addSampleBtn.addEventListener('click', addSample);
        allDOMElements.globalResetBtn.addEventListener('click', () => { if(confirm('¿Estás seguro? Se borrarán TODOS los datos, incluidas las muestras añadidas.')) globalReset(); });
        allDOMElements.openSimulationBtn.addEventListener('click', openSimulationModal);
        allDOMElements.closeSimulationModal.addEventListener('click', closeSimulationModal);
        allDOMElements.simPlayPauseBtn.addEventListener('click', startStopSimulation);
        allDOMElements.simResetBtn.addEventListener('click', resetSimulation);
        allDOMElements.speedControls.addEventListener('click', (e) => { const target = e.target.closest('.speed-control-btn'); if (!target) return; simulationState.speed = parseInt(target.dataset.speed, 10); allDOMElements.speedControls.querySelectorAll('.speed-control-btn').forEach(btn => btn.classList.remove('active')); target.classList.add('active'); });
        allDOMElements.simProgressBar.addEventListener('input', handleScrubbing);
        allDOMElements.exportAvisosBtn.addEventListener('click', exportarAvisos);

        allDOMElements.gasSlider.addEventListener('input', (e) => { allDOMElements.gasValueDisplay.textContent = `${e.target.value} %`; });
        allDOMElements.gasSlider.addEventListener('change', (e) => { logAdjustment('gas', e.target.value); });
        allDOMElements.airSelect.addEventListener('change', (e) => { logAdjustment('air', e.target.value); });
        
        allDOMElements.addRowBtn.addEventListener('click', () => addNewManualRow());

        const { startBtn, stopBtn, resetBtn, dataLogBody, infoPanelsContainer, openReportChoicesBtn, eventButtons, saveEventBtn, cancelEventBtn, modeSwitch, closeChoiceModal, importProfileBtn, profileImportInput, importCsvBtn, csvImportInput, saveSessionBtn, openSessionBtn, sessionImportInput } = allDOMElements;
        startBtn.addEventListener('click', startTimer); stopBtn.addEventListener('click', stopTimer);
        resetBtn.addEventListener('click', resetCurrentRoast);
        infoPanelsContainer.addEventListener('change', (e) => { if (e.target.tagName === 'INPUT') { state.samples[state.currentSample].info[e.target.dataset.field] = e.target.value; if (e.target.dataset.field === 'roastedWeight') updateSummary(state.currentSample); } });
        dataLogBody.addEventListener('click', (e) => { const cell = e.target.closest('td'); if (!cell || cell.querySelector('input')) return; if (cell.classList.contains('temp-cell')) makeCellEditable(cell, 'temp'); if (state.mode === 'manual' && cell.classList.contains('time-cell')) makeCellEditable(cell, 'time'); });
        openReportChoicesBtn.addEventListener('click', openReportChoiceModal);
        eventButtons.forEach(button => button.addEventListener('click', () => openEventModal(button.dataset.event)));
        saveEventBtn.addEventListener('click', saveEvent); cancelEventBtn.addEventListener('click', closeEventModal);
        modeSwitch.addEventListener('click', toggleMode);
        closeChoiceModal.addEventListener('click', () => allDOMElements.reportChoiceModal.classList.remove('visible'));
        importProfileBtn.addEventListener('click', () => profileImportInput.click());
        profileImportInput.addEventListener('change', handleProfileImport);
        importCsvBtn.addEventListener('click', () => csvImportInput.click());
        csvImportInput.addEventListener('change', handleCsvProfileImport);
        saveSessionBtn.addEventListener('click', saveSession);
        openSessionBtn.addEventListener('click', () => sessionImportInput.click());
        sessionImportInput.addEventListener('change', handleSessionImport);
        window.addEventListener('resize', () => { if (roastChart) setTimeout(() => { setupChart(); updateChartData(); }, 150); });
    }

    function initialize() { addEventListeners(); globalReset(); }
    
    function logAdjustment(type, value) {
        const s = state.samples[state.currentSample];
        if (!s) return;

        let adjustmentTime;
        let lastKnownTemp;

        if (state.mode === 'live') {
            if (!s.isTicking) {
                alert('Inicia el tueste para registrar cambios.');
                const lastAdjustment = [...s.adjustments].filter(a => a.type === type).pop();
                if (lastAdjustment) {
                    if (type === 'gas') {
                        allDOMElements.gasSlider.value = lastAdjustment.value;
                        allDOMElements.gasValueDisplay.textContent = `${lastAdjustment.value} %`;
                    } else {
                        allDOMElements.airSelect.value = lastAdjustment.value;
                    }
                }
                return;
            }
            adjustmentTime = s.elapsedSeconds;
            const lastValidDataPoint = [...s.data].filter(d => d.temp !== null).pop();
            lastKnownTemp = lastValidDataPoint ? lastValidDataPoint.temp : 0;
        } else { // --- MODO MANUAL MEJORADO ---
            let targetPoint = null;
            // 1. Prioriza la fila activa que se está editando
            if (manualModeActiveTime !== null) {
                targetPoint = s.data.find(d => d.time === manualModeActiveTime && !d.adjustment);
            }
            // 2. Si no hay fila activa, usa el último punto con datos
            if (!targetPoint) {
                targetPoint = [...s.data].filter(d => d.temp !== null).pop();
            }
            // 3. Si no hay ningún punto, no hacer nada
            if (!targetPoint) {
                alert('Añade al menos un punto de datos (tiempo y temperatura) antes de registrar un ajuste.');
                const lastAdjustment = [...s.adjustments].filter(a => a.type === type).pop();
                if (lastAdjustment) {
                    if (type === 'gas') allDOMElements.gasSlider.value = lastAdjustment.value;
                    else allDOMElements.airSelect.value = lastAdjustment.value;
                }
                return;
            }
            adjustmentTime = targetPoint.time;
            lastKnownTemp = targetPoint.temp;
        }

        const floatValue = parseFloat(value);
        s.adjustments.push({ time: adjustmentTime, type: type, value: floatValue });
        s.adjustments.sort((a, b) => a.time - b.time);

        const newAdjustmentPoint = {
            time: adjustmentTime,
            temp: lastKnownTemp,
            adjustment: { type, value: floatValue }
        };
        s.data.push(newAdjustmentPoint);
        s.data.sort((a, b) => a.time - b.time);

        populateDataLogTable();
        updateChartData();
    }
    
    function addSample() { const sampleIds = Object.keys(state.samples); const lastSampleId = sampleIds[sampleIds.length - 1]; const newSampleId = String.fromCharCode(lastSampleId.charCodeAt(0) + 1); if (state.samples[newSampleId]) { alert("Límite de muestras alcanzado."); return; } state.samples[newSampleId] = createEmptySample(); createUIForSingleSample(newSampleId); switchSample(newSampleId); }
    
    function setupSimulationChart(maxTime = 14 * 60) { if (simulationChart) simulationChart.destroy(); const ctx = allDOMElements.simChartCanvas.getContext('2d'); simulationChart = new Chart(ctx, { type: 'line', data: { datasets: [] }, options: { responsive: true, maintainAspectRatio: false, animation: false, devicePixelRatio: window.devicePixelRatio || 1, scales: { x: { type: 'linear', position: 'bottom', title: { display: true, text: 'Tiempo' }, min: 0, max: maxTime, ticks: { stepSize: 60, callback: formatTime } }, yTemp: { type: 'linear', position: 'left', title: { display: true, text: 'Temperatura (°C)' }, suggestedMin: 80, suggestedMax: 240 }, yGas: { type: 'linear', position: 'right', display: false, min: 0, max: 100 }, yAir: { type: 'linear', position: 'right', display: false, min: 0, max: 100 } } } }); }
    function resetSimulation() { clearInterval(simulationInterval); simulationInterval = null; simulationState = { isPlaying: false, elapsedSeconds: 0, maxTime: 14 * 60, speed: 1, fullData: {} }; allDOMElements.simPlayPauseBtn.textContent = 'Iniciar'; allDOMElements.simPlayPauseBtn.disabled = false; allDOMElements.simTimer.textContent = '00:00'; allDOMElements.speedControls.querySelectorAll('.speed-control-btn').forEach(btn => { btn.classList.remove('active'); if(parseInt(btn.dataset.speed) === 1) btn.classList.add('active'); }); allDOMElements.simProgressBar.value = 0; allDOMElements.simProgressBar.max = 14 * 60; allDOMElements.simAvisosContainer.innerHTML = '<p class="aviso aviso-info">El análisis del asistente aparecerá aquí.</p>'; if (simulationChart) { simulationChart.options.scales.x.max = simulationState.maxTime; simulationChart.data.datasets = []; simulationChart.update('none'); } }
    
    function startStopSimulation() {
        if (simulationState.isPlaying) { clearInterval(simulationInterval); simulationInterval = null; simulationState.isPlaying = false; allDOMElements.simPlayPauseBtn.textContent = 'Reanudar'; } 
        else {
            if (simulationState.elapsedSeconds >= simulationState.maxTime) { resetSimulation(); }
            if (Object.keys(simulationState.fullData).length === 0) {
                const selectedSampleIds = Array.from(allDOMElements.simSampleChoices.querySelectorAll('input:checked')).map(cb => cb.dataset.sampleId);
                if (selectedSampleIds.length === 0) { alert('Selecciona al menos una muestra para simular.'); return; }
                
                let currentMaxTime = 0;
                simulationState.fullData = {};
                simulationChart.data.datasets = [];

                selectedSampleIds.forEach(id => {
                    const sample = state.samples[id];
                    const sampleData = sample.data.filter(d => d.temp !== null).sort((a,b) => a.time - b.time);
                    if (sampleData.length > 0) {
                        const lastTime = sampleData[sampleData.length - 1].time;
                        if (lastTime > currentMaxTime) currentMaxTime = lastTime;
                        
                        const eventTimeToIcon = {};
                        Object.keys(sample.events).forEach(key => { const event = sample.events[key]; if(event && event.time !== undefined) { eventTimeToIcon[event.time] = pointIcons[key] || 'circle'; } });
                        
                        simulationState.fullData[id] = { rawData: sampleData, pointRadii: sampleData.map(d => eventTimeToIcon[d.time] ? 8 : 3), pointStyles: sampleData.map(d => eventTimeToIcon[d.time] || 'circle'), events: sample.events, adjustments: sample.adjustments || [] };
                        
                        const color = getSampleColor(id);
                        simulationChart.data.datasets.push({ label: `Temp ${id}`, data: [], borderColor: color, yAxisID: 'yTemp', tension: 0.1, fill: false });
                        simulationChart.data.datasets.push({ label: `Gas % ${id}`, data: [], borderColor: '#3a86ff', backgroundColor: 'rgba(58, 134, 255, 0.1)', yAxisID: 'yGas', stepped: true, fill: true, hidden: false });
                        simulationChart.data.datasets.push({ label: `Aire ${id}`, data: [], borderColor: '#ffbe0b', backgroundColor: 'rgba(255, 190, 11, 0.1)', yAxisID: 'yAir', stepped: true, fill: true, hidden: false });
                    }
                });
                simulationState.maxTime = currentMaxTime > 0 ? currentMaxTime : 14 * 60;
                simulationChart.options.scales.x.max = simulationState.maxTime;
                allDOMElements.simProgressBar.max = simulationState.maxTime;
            }
            simulationState.isPlaying = true;
            allDOMElements.simPlayPauseBtn.textContent = 'Pausar';
            simulationInterval = setInterval(simulationTick, 100);
        }
    }
    
    function handleScrubbing(e) { if (simulationState.isPlaying) { startStopSimulation(); } simulationState.elapsedSeconds = parseInt(e.target.value, 10); updateSimulationView(); }
    
    function updateSimulationView() {
        const elapsedFloor = Math.floor(simulationState.elapsedSeconds);
        allDOMElements.simTimer.textContent = formatTime(elapsedFloor);
        allDOMElements.simProgressBar.value = elapsedFloor;
        
        const sampleIds = Object.keys(simulationState.fullData);
        for (let i = 0; i < sampleIds.length; i++) {
            const sampleId = sampleIds[i];
            const sampleInfo = simulationState.fullData[sampleId];
            const datasetStartIndex = i * 3;

            if (sampleInfo) {
                const tempData = sampleInfo.rawData.filter(p => p.time <= elapsedFloor);
                simulationChart.data.datasets[datasetStartIndex].data = tempData.map(p => ({x: p.time, y: p.temp}));
                
                const gasData = sampleInfo.adjustments.filter(p => p.type === 'gas' && p.time <= elapsedFloor);
                simulationChart.data.datasets[datasetStartIndex + 1].data = gasData.map(p => ({x: p.time, y: p.value}));
                
                const airData = sampleInfo.adjustments.filter(p => p.type === 'air' && p.time <= elapsedFloor);
                simulationChart.data.datasets[datasetStartIndex + 2].data = airData.map(p => ({x: p.time, y: p.value}));
            }
        }
        
        simulationChart.update('none');
        verificarEstadoSimulacion();
    }

    function simulationTick() { simulationState.elapsedSeconds += simulationState.speed * 0.1; if (simulationState.elapsedSeconds >= simulationState.maxTime) { simulationState.elapsedSeconds = simulationState.maxTime; clearInterval(simulationInterval); simulationInterval = null; simulationState.isPlaying = false; allDOMElements.simPlayPauseBtn.textContent = 'Finalizado'; } updateSimulationView(); }
    function verificarEstadoSimulacion() { const elapsedFloor = Math.floor(simulationState.elapsedSeconds); const allMessages = []; const selectedSamples = [...new Set(simulationChart.data.datasets.map(d => d.label.split(' ')[1]).filter(Boolean))]; selectedSamples.forEach(id => { const sampleInfo = simulationState.fullData[id]; if (!sampleInfo) return; const data = sampleInfo.rawData.filter(p => p.time <= elapsedFloor); if (data.length < 2) return; const lastPoint = data[data.length - 1]; const prevPoint = data.length > 1 ? data[data.length - 2] : data[0]; const timeDiffMinutes = (lastPoint.time - prevPoint.time) / 60; const rorActual = timeDiffMinutes > 0 ? (lastPoint.temp - prevPoint.temp) / timeDiffMinutes : 0; let faseActualKey = 'Equilibrio'; if (sampleInfo.events.turning_point && elapsedFloor >= sampleInfo.events.turning_point.time) faseActualKey = 'Amarillo'; if (sampleInfo.events.yellow && elapsedFloor >= sampleInfo.events.yellow.time) faseActualKey = 'Primer Crack'; if (sampleInfo.events.crack && elapsedFloor >= sampleInfo.events.crack.time) { allMessages.push({id, text: `<strong>Muestra ${id} (Desarrollo):</strong> Controlando DTR.`}); return; } const perfilFase = perfilIdeal[faseActualKey]; if (rorActual < perfilFase.rorMedioMin) allMessages.push({id, text: `<strong>Muestra ${id} (Error):</strong> ${perfilFase.soluciones.rorBajo(rorActual)}`}); if (rorActual > perfilFase.rorMedioMax) allMessages.push({id, text: `<strong>Muestra ${id} (Error):</strong> ${perfilFase.soluciones.rorAlto(rorActual)}`}); }); mostrarAvisosSimulacion(allMessages); }
    function mostrarAvisosSimulacion(mensajes) { const container = allDOMElements.simAvisosContainer; container.innerHTML = ''; if (mensajes.length === 0) { container.innerHTML = '<p class="aviso aviso-info">Todo en orden para los tuestes seleccionados en este momento.</p>'; } else { mensajes.forEach(msg => { const p = document.createElement('p'); p.className = 'aviso aviso-warning'; p.innerHTML = msg.text; container.appendChild(p); }); } }
    
    function handleCsvProfileImport(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function(e) { try { const lines = e.target.result.split(/\r\n|\n/); const newData = []; const startIndex = lines[0].toLowerCase().includes('tiempo') ? 1 : 0; for (let i = startIndex; i < lines.length; i++) { const parts = lines[i].split(/[,;]/); if (parts.length < 2) continue; const time = parseInt(parts[0].trim(), 10); const temp = parseFloat(parts[1].trim()); if (!isNaN(time) && !isNaN(temp)) { newData.push({ time: time, temp: temp }); } } if (newData.length === 0) { throw new Error('No se encontraron datos válidos. Formato: tiempo,temperatura'); } const s = state.samples[state.currentSample]; Object.assign(s, createEmptySample(), { info: s.info }); s.data = newData.sort((a,b) => a.time - b.time); updateUI(); alert(`Perfil CSV importado a Muestra ${state.currentSample}.`); } catch(error) { alert(`Error al importar CSV: ${error.message}`); } }; reader.readAsText(file); event.target.value = ''; }
    function saveSession() { if (state.samples[state.currentSample].isTicking) { alert('Detén el tueste actual antes de guardar.'); return; } state.samples[state.currentSample].asistenteAvisos = analizarPerfilCompleto(state.samples[state.currentSample]); const dataToExport = JSON.stringify(state, null, 2); const blob = new Blob([dataToExport], {type: "application/json"}); const url = URL.createObjectURL(blob); const link = document.createElement("a"); const date = new Date().toISOString().split('T')[0]; link.setAttribute("href", url); link.setAttribute("download", `Sesion_Tueste_${date}.json`); document.body.appendChild(link); link.click(); document.body.removeChild(link); }
    function handleSessionImport(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function(e) { try { const importedState = JSON.parse(e.target.result); if (!importedState.samples || !importedState.samples.A || !importedState.mode || !importedState.currentSample) { throw new Error('El archivo no parece ser un archivo de sesión válido.'); } Object.values(importedState.samples).forEach(sample => { sample.asistenteAvisos = sample.asistenteAvisos || []; sample.adjustments = sample.adjustments || []; }); if (timerInterval) clearInterval(timerInterval); state = importedState; restoreFullSessionUI(); alert('¡Sesión cargada correctamente!'); } catch (error) { alert(`Error al cargar sesión: ${error.message}`); globalReset(); } }; reader.readAsText(file); event.target.value = ''; }

    function restoreFullSessionUI() { rebuildSampleUI(); setMode(state.mode, true); switchSample(state.currentSample, true); Object.keys(state.samples).forEach(id => { restoreInfoInputs(id); updateSummary(id); }); }
    function toggleMode() { const newMode = state.mode === 'live' ? 'manual' : 'live'; setMode(newMode); }
    function setMode(newMode, force = false) { if (state.samples[state.currentSample]?.isTicking && !force) { alert("Detén el tueste para cambiar de modo."); return; } state.mode = newMode; allDOMElements.body.className = `mode-${newMode}`; updateButtonsState(); populateDataLogTable();}
    
    function switchSample(sampleId, force = false) { 
        if (state.samples[state.currentSample]?.isTicking && !force) { 
            alert("Detén el tueste para cambiar de muestra."); 
            return; 
        } 
        manualModeActiveTime = null; // Reinicia la fila activa
        state.currentSample = sampleId; 
        document.querySelectorAll('.tab-button').forEach(b => { 
            b.classList.remove('active'); 
            b.style.backgroundColor = ''; 
            b.style.color = ''; 
        }); 
        const activeTab = document.querySelector(`.tab-button[data-sample="${sampleId}"]`); 
        if(activeTab) { 
            activeTab.classList.add('active'); 
            activeTab.style.backgroundColor = getSampleColor(sampleId); 
            activeTab.style.color = 'white'; 
        } 
        document.querySelectorAll('.info-panel').forEach(p => p.classList.remove('active')); 
        const activePanel = document.getElementById(`info-panel-${sampleId}`); 
        if(activePanel) { 
            activePanel.classList.add('active'); 
            activePanel.style.borderColor = getSampleColor(sampleId); 
        } 
        restoreInfoInputs(sampleId); 
        setupChart(); 
        updateUI(); 
    }
    
    function startTimer() {
        const s = state.samples[state.currentSample];
        if (s.isTicking || state.mode === 'manual') return;
        manualModeActiveTime = null;
        s.asistenteAvisos = [];
        s.data = createLiveModeData();
        
        const initialGas = 100;
        const initialAir = 100;
        s.adjustments = [
            { time: 0, type: 'gas', value: parseFloat(initialGas) },
            { time: 0, type: 'air', value: parseFloat(initialAir) }
        ];

        populateDataLogTable();
        s.isTicking = true;
        s.startTime = Date.now() - s.elapsedSeconds * 1000;
        timerInterval = setInterval(tick, 1000);
        updateButtonsState();
        updateChartData();
        tick();
    }

    function stopTimer() { const s = state.samples[state.currentSample]; if (!s.isTicking) return; s.isTicking = false; clearInterval(timerInterval); updateButtonsState(); s.asistenteAvisos = analizarPerfilCompleto(s); updateSummary(state.currentSample); }
    function resetCurrentRoast() { const s = state.samples[state.currentSample]; if (s.isTicking) stopTimer(); Object.assign(s, createEmptySample(), {info: s.info}); manualModeActiveTime = null; updateUI(); }
    function globalReset() { if (timerInterval) clearInterval(timerInterval); state = getInitialState(); manualModeActiveTime = null; restoreFullSessionUI(); }
    
    function tick() {
        const s = state.samples[state.currentSample];
        if (!s.isTicking) return;
        s.elapsedSeconds = Math.round((Date.now() - s.startTime) / 1000);
        allDOMElements.timerDisplay.textContent = formatTime(s.elapsedSeconds);
        const currentIntervalTime = Math.floor(s.elapsedSeconds / LOG_INTERVAL) * LOG_INTERVAL;

        if (s.elapsedSeconds > INITIAL_VISIBLE_TIME && s.elapsedSeconds % LOG_INTERVAL === 0) {
            const newTime = currentIntervalTime;
            const exists = s.data.some(d => d.time === newTime);
            if (!exists) {
                s.data.push({ time: newTime, temp: null });
                populateDataLogTable();
            }
        }
        
        const row = document.querySelector(`.data-log tr[data-time="${currentIntervalTime}"]`);
        if (row && !row.classList.contains('active-row')) {
            document.querySelectorAll('.active-row').forEach(r => r.classList.remove('active-row'));
            row.classList.add('active-row');
            const tempCell = row.querySelector('.temp-cell');
            if (tempCell && !tempCell.textContent && !tempCell.querySelector('input')) {
                makeCellEditable(tempCell, 'temp');
            }
        }
        if (s.elapsedSeconds > 0 && s.elapsedSeconds % LOG_INTERVAL === 0) {
            playBeep();
        }
    }

    function addNewManualRow(makeEditable = true) {
        const s = state.samples[state.currentSample];
        const lastDataPoint = s.data.length > 0 ? s.data[s.data.length - 1] : { time: -LOG_INTERVAL };
        const newTime = lastDataPoint.time + LOG_INTERVAL;

        if (newTime > MAX_LOG_TIME) {
            alert('Se ha alcanzado el tiempo máximo de tueste.');
            return;
        }

        s.data.push({ time: newTime, temp: null });
        populateDataLogTable();

        if (makeEditable) {
            const newRow = allDOMElements.dataLogBody.lastElementChild;
            if (newRow) {
                const timeCell = newRow.querySelector('.time-cell');
                if (timeCell) makeCellEditable(timeCell, 'time');
            }
        }
    }
    
    function makeCellEditable(cell, type) {
        const row = cell.parentElement;
        if (state.mode === 'manual') {
            manualModeActiveTime = parseInt(row.dataset.time, 10);
        }
        const s = state.samples[state.currentSample];
        const timeOfRow = parseInt(row.dataset.time);
        
        const dataPoint = s.data.find((d) => d.time === timeOfRow);

        if (type === 'temp' && dataPoint && dataPoint.adjustment) {
            alert("La temperatura en una fila de ajuste es solo de referencia y no se puede editar directamente.");
            return;
        }

        const currentValue = cell.textContent;
        cell.innerHTML = '';
        const input = document.createElement('input');
        input.type = type === 'temp' ? 'number' : 'text';
        input.value = parseFloat(currentValue) || currentValue;

        const saveAndExit = () => {
            if (type === 'temp') {
                const newValue = parseFloat(input.value);
                if (dataPoint) dataPoint.temp = isNaN(newValue) ? null : newValue;
            } else { 
                const newTime = parseTimeToSeconds(input.value);
                if (dataPoint && newTime !== null) {
                     const timeExists = s.data.some(d => d.time === newTime && d !== dataPoint);
                     if (timeExists && !dataPoint.adjustment) {
                         alert(`El tiempo ${formatTime(newTime)} ya existe. Por favor, use otro tiempo.`);
                         s.data.sort((a,b) => a.time - b.time); 
                         populateDataLogTable();
                         updateChartData();
                         return;
                     }
                    dataPoint.time = newTime;
                } else if (dataPoint) {
                     console.log("Tiempo inválido, no se realizaron cambios.");
                }
            }
            s.data.sort((a,b) => a.time - b.time);
            populateDataLogTable();
            updateChartData();
        };
        input.addEventListener('blur', saveAndExit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                input.removeEventListener('blur', saveAndExit);
                input.blur();
                cell.textContent = currentValue;
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                input.blur();
                const isLastRow = row === allDOMElements.dataLogBody.lastElementChild;
                if (e.key === 'Enter' && state.mode === 'manual' && type === 'temp' && isLastRow && !dataPoint.adjustment) {
                    addNewManualRow();
                } else {
                    let nextCell;
                    if (state.mode === 'manual') {
                        if (type === 'time') {
                            nextCell = cell.nextElementSibling;
                        } else {
                            const nextRow = row.nextElementSibling;
                            if (nextRow) nextCell = nextRow.querySelector('.time-cell');
                        }
                    } else {
                        const nextRow = row.nextElementSibling;
                        if (nextRow) nextCell = nextRow.querySelector('.temp-cell:not(:has(input))');
                    }
                    if (nextCell) makeCellEditable(nextCell, type === 'temp' ? 'temp' : 'time');
                }
            }
        });
        cell.appendChild(input);
        input.focus();
        input.select();
    }

    function logTemperature(time, temp) { const s = state.samples[state.currentSample]; let dataPoint = s.data.find(d => d.time === time && !d.adjustment); if (dataPoint) { dataPoint.temp = temp; } else { s.data.push({ time, temp }); s.data.sort((a,b) => a.time - b.time); } populateDataLogTable(); updateChartData(); }
    
    function openEventModal(eventType) {
        currentEventToSave = eventType;
        const { eventModal, eventModalTitle, eventTimeInput, eventTempInput } = allDOMElements;
        const s = state.samples[state.currentSample];
        const existingEvent = s.events[eventType];
        eventModalTitle.textContent = `${existingEvent ? 'Editar' : 'Registrar'} ${eventNames[eventType]}`;

        if (existingEvent) {
            eventTimeInput.value = formatTime(existingEvent.time);
            eventTempInput.value = existingEvent.temp.toFixed(1);
        } else { // --- MODO MANUAL MEJORADO ---
            let currentTime;
            let currentTemp;
            let activePointInManual = null;

            // 1. Prioriza la fila activa en modo manual
            if (state.mode === 'manual' && manualModeActiveTime !== null) {
                activePointInManual = s.data.find(d => d.time === manualModeActiveTime && d.temp !== null && !d.adjustment);
            }

            if (activePointInManual) {
                currentTime = activePointInManual.time;
                currentTemp = activePointInManual.temp;
            } else {
                // 2. Si no, usa la lógica original (último punto o tiempo en vivo)
                const lastDataPoint = s.data.filter(d => d.temp !== null).sort((a, b) => b.time - a.time)[0];
                currentTime = state.mode === 'live' ? s.elapsedSeconds : (lastDataPoint ? lastDataPoint.time : 0);
                currentTemp = lastDataPoint ? lastDataPoint.temp : null;
            }

            eventTimeInput.value = formatTime(currentTime);
            eventTempInput.value = currentTemp !== null ? currentTemp.toFixed(1) : '';
        }
        eventModal.classList.add('visible');
        eventTimeInput.focus();
    }

    function closeEventModal() { allDOMElements.eventModal.classList.remove('visible'); currentEventToSave = null; }
    function saveEvent() { const { eventTimeInput, eventTempInput } = allDOMElements; const timeInSeconds = parseTimeToSeconds(eventTimeInput.value); const temp = parseFloat(eventTempInput.value); if (timeInSeconds === null || isNaN(temp)) { alert('Datos inválidos.'); return; } const s = state.samples[state.currentSample]; const existingEvent = s.events[currentEventToSave]; if (existingEvent) { s.data = s.data.filter(d => d.time !== existingEvent.time || d.temp !== existingEvent.temp); } const currentIndex = eventOrder.indexOf(currentEventToSave); if (currentIndex > 0) { const prevEvent = s.events[eventOrder[currentIndex - 1]]; if (prevEvent && timeInSeconds < prevEvent.time) { alert(`Error: El tiempo de "${eventNames[currentEventToSave]}" (${formatTime(timeInSeconds)}) no puede ser anterior al de "${eventNames[eventOrder[currentIndex-1]]}" (${formatTime(prevEvent.time)}).`); return; } } if (currentIndex < eventOrder.length - 1) { const nextEvent = s.events[eventOrder[currentIndex + 1]]; if (nextEvent && timeInSeconds > nextEvent.time) { alert(`Error: El tiempo de "${eventNames[currentEventToSave]}" (${formatTime(timeInSeconds)}) no puede ser posterior al de "${eventNames[eventOrder[currentIndex+1]]}" (${formatTime(nextEvent.time)}).`); return; } } s.events[currentEventToSave] = { time: timeInSeconds, temp: temp }; if (currentEventToSave === 'end') { if (state.mode === 'live' && s.isTicking) { stopTimer(); } } logTemperature(timeInSeconds, temp); updateUI(); closeEventModal(); }
    function handleProfileImport(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function(e) { try { const importedProfile = JSON.parse(e.target.result); if (!importedProfile.data || !importedProfile.events || !importedProfile.info) { throw new Error('Formato de perfil JSON inválido.'); } const s = state.samples[state.currentSample]; Object.assign(s, createEmptySample()); Object.assign(s, importedProfile); s.asistenteAvisos = s.asistenteAvisos || []; s.adjustments = s.adjustments || []; updateUI(); restoreInfoInputs(state.currentSample); } catch (error) { alert(`Error al importar perfil: ${error.message}`); } }; reader.readAsText(file); event.target.value = ''; }
    
    function analizarPerfilCompleto(sample) {
        const data = sample.data.filter(d => d.temp !== null).sort((a, b) => a.time - b.time);
        const avisos = [];
        const avisosRegistrados = {}; 

        function registrarAviso(fase, tipoAviso, tipoMensaje, valor) {
            const clave = `${fase}-${tipoAviso}`;
            if (!avisosRegistrados[clave] && perfilIdeal[fase].soluciones[tipoAviso]) {
                const texto = perfilIdeal[fase].soluciones[tipoAviso](valor);
                avisos.push({ fase, tipo: tipoAviso, texto, tipoMensaje });
                avisosRegistrados[clave] = true;
            }
        }
    
        if (sample.events.turning_point) {
            const evento = sample.events.turning_point; const perfil = perfilIdeal.Equilibrio;
            if (evento.time > perfil.tiempoAcumuladoMax) registrarAviso('Equilibrio', 'tiempoLargo', 'warning', evento.time);
            if (evento.temp < perfil.tempObjetivoMin || evento.temp > perfil.tempObjetivoMax) registrarAviso('Equilibrio', 'tempFueraDeRango', 'warning', evento.temp);
        }
        if (sample.events.yellow) {
            const evento = sample.events.yellow; const perfil = perfilIdeal.Amarillo;
            if (evento.time > perfil.tiempoAcumuladoMax) registrarAviso('Amarillo', 'tiempoLargo', 'warning', evento.time);
        }
        if (sample.events.crack) {
            const evento = sample.events.crack; const perfil = perfilIdeal["Primer Crack"];
            if (evento.time > perfil.tiempoAcumuladoMax) registrarAviso('Primer Crack', 'tiempoLargo', 'warning', evento.time);
        }

        for (let i = 1; i < data.length; i++) {
            const curr = data[i]; const prev = data[i-1]; const timeDiffMinutes = (curr.time - prev.time) / 60; const ror = timeDiffMinutes > 0 ? (curr.temp - prev.temp) / timeDiffMinutes : 0;
            let faseActualKey = 'Equilibrio';
            if (sample.events.turning_point && curr.time >= sample.events.turning_point.time) faseActualKey = 'Amarillo';
            if (sample.events.yellow && curr.time >= sample.events.yellow.time) faseActualKey = 'Primer Crack';
            if (sample.events.crack && curr.time >= sample.events.crack.time) continue;
            const perfilFase = perfilIdeal[faseActualKey];
            if (ror < perfilFase.rorMedioMin) registrarAviso(faseActualKey, 'rorBajo', 'error', ror);
            if (ror > perfilFase.rorMedioMax) registrarAviso(faseActualKey, 'rorAlto', 'error', ror);
        }
        
        (sample.adjustments || []).forEach(adj => {
             let faseActualKey = 'Equilibrio';
            if (sample.events.turning_point && adj.time >= sample.events.turning_point.time) faseActualKey = 'Amarillo';
            if (sample.events.yellow && adj.time >= sample.events.yellow.time) faseActualKey = 'Primer Crack';
            if (sample.events.crack && adj.time >= sample.events.crack.time) return;

            const perfilFase = perfilIdeal[faseActualKey];
            if(adj.type === 'gas' && perfilFase.gasRecomendado){
                if(adj.value < perfilFase.gasRecomendado.min) registrarAviso(faseActualKey, 'gasBajo', 'warning', adj.value);
                if(adj.value > perfilFase.gasRecomendado.max) registrarAviso(faseActualKey, 'gasAlto', 'warning', adj.value);
            }
            if(adj.type === 'air' && perfilFase.aireRecomendado){
                if(adj.value < perfilFase.aireRecomendado.min) registrarAviso(faseActualKey, 'aireBajo', 'warning', adj.value);
                if(adj.value > perfilFase.aireRecomendado.max) registrarAviso(faseActualKey, 'aireAlto', 'warning', adj.value);
            }
        });

        return avisos;
    }
    
    function verificarEstadoTueste(sample) {
        const data = sample.data.filter(d => d.temp !== null).sort((a, b) => a.time - b.time);
        if (data.length < 2) { allDOMElements.avisosContainer.innerHTML = '<p class="aviso aviso-info">Análisis en vivo comenzará con más datos.</p>'; return; }
        
        const lastPoint = data[data.length - 1];
        let faseActualKey = 'Equilibrio';
        if (sample.events.turning_point) faseActualKey = 'Amarillo';
        if (sample.events.yellow) faseActualKey = 'Primer Crack';
        if (sample.events.crack) { allDOMElements.avisosContainer.innerHTML = '<p class="aviso aviso-info">Fase de Desarrollo. Controlar DTR.</p>'; return; }
        
        const perfilFase = perfilIdeal[faseActualKey];
        const prevPoint = data[data.length - 2];
        const timeDiffMinutes = (lastPoint.time - prevPoint.time) / 60;
        const rorActual = timeDiffMinutes > 0 ? (lastPoint.temp - prevPoint.temp) / timeDiffMinutes : 0;

        let mensajesParaMostrar = [];

        if (rorActual < perfilFase.rorMedioMin) mensajesParaMostrar.push({ tipo: 'error', texto: perfilFase.soluciones.rorBajo(rorActual) });
        if (rorActual > perfilFase.rorMedioMax) mensajesParaMostrar.push({ tipo: 'error', texto: perfilFase.soluciones.rorAlto(rorActual) });

        const ultimoGas = (sample.adjustments || []).filter(a => a.type === 'gas').pop();
        const ultimoAire = (sample.adjustments || []).filter(a => a.type === 'air').pop();

        if (ultimoGas && perfilFase.gasRecomendado) {
            if (ultimoGas.value < perfilFase.gasRecomendado.min) mensajesParaMostrar.push({ tipo: 'warning', texto: `El gas actual (${ultimoGas.value} mbar) parece bajo para esta fase (recomendado: ${perfilFase.gasRecomendado.min}-${perfilFase.gasRecomendado.max}).` });
            if (ultimoGas.value > perfilFase.gasRecomendado.max) mensajesParaMostrar.push({ tipo: 'warning', texto: `El gas actual (${ultimoGas.value} mbar) parece alto para esta fase (recomendado: ${perfilFase.gasRecomendado.min}-${perfilFase.gasRecomendado.max}).` });
        }
        if (ultimoAire && perfilFase.aireRecomendado) {
             if (ultimoAire.value < perfilFase.aireRecomendado.min) mensajesParaMostrar.push({ tipo: 'warning', texto: `El aire actual (${ultimoAire.value}%) parece bajo para esta fase (recomendado: ${perfilFase.aireRecomendado.min}-${perfilFase.aireRecomendado.max}).` });
            if (ultimoAire.value > perfilFase.aireRecomendado.max) mensajesParaMostrar.push({ tipo: 'warning', texto: `El aire actual (${ultimoAire.value}%) parece alto para esta fase (recomendado: ${perfilFase.aireRecomendado.min}-${perfilFase.aireRecomendado.max}).` });
        }
        
        allDOMElements.avisosContainer.innerHTML = '';
        if (mensajesParaMostrar.length === 0) { allDOMElements.avisosContainer.innerHTML = `<p class="aviso aviso-info"><strong>${perfilFase.nombreFase}:</strong> Todo en orden.</p>`; } 
        else { mensajesParaMostrar.forEach(msg => { const p = document.createElement('p'); p.className = `aviso aviso-${msg.tipo}`; p.innerHTML = msg.texto; allDOMElements.avisosContainer.appendChild(p); }); }
    }
    
    function updateUI() { const s = state.samples[state.currentSample]; allDOMElements.timerDisplay.textContent = formatTime(s.elapsedSeconds); populateDataLogTable(); updateChartData(); updateEventButtonStates(); updateButtonsState(); Object.keys(state.samples).forEach(id => updateSummary(id)); }
    function restoreInfoInputs(sampleId) { const s = state.samples[sampleId]; if (!s) return; const panel = document.getElementById(`info-panel-${sampleId}`); if(panel) { panel.querySelectorAll('input').forEach(input => { input.value = s.info[input.dataset.field] || ''; }); } }
    function updateEventButtonStates() { allDOMElements.eventButtons.forEach(btn => { if(state.samples[state.currentSample].events[btn.dataset.event]) btn.classList.add('marked'); else btn.classList.remove('marked'); }); }
    
    function createLiveModeData() {
        const data = [];
        for (let t = 0; t <= INITIAL_VISIBLE_TIME; t += LOG_INTERVAL) {
            data.push({ time: t, temp: null });
        }
        return data;
    }

    function updateButtonsState() { const s = state.samples[state.currentSample]; const { startBtn, stopBtn, resetBtn, importProfileBtn, importCsvBtn } = allDOMElements; const isLive = state.mode === 'live'; const isTicking = s.isTicking; startBtn.disabled = !isLive || isTicking; stopBtn.disabled = !isLive || !isTicking; resetBtn.disabled = isTicking; importProfileBtn.disabled = isTicking; importCsvBtn.disabled = isTicking; allDOMElements.addRowBtn.style.display = isLive ? 'none' : 'block'; }
    
    function setupChart() {
        if (roastChart) roastChart.destroy();
        const ctx = allDOMElements.chartCanvas.getContext('2d');
        roastChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    { label: 'Temp. Grano (°C)', data: [], tension: 0.1, yAxisID: 'y' },
                    { label: 'RoR (°C/min)', data: [], tension: 0.1, borderDash: [5, 5], yAxisID: 'y1' },
                    { label: 'Gas (mbar)', data: [], yAxisID: 'y', borderColor: 'hotpink', backgroundColor: 'rgba(255, 105, 180, 0.15)', fill: true, stepped: true },
                    { label: 'Aire (%)', data: [], yAxisID: 'y', borderColor: 'red', backgroundColor: 'rgba(255, 0, 0, 0.15)', fill: true, stepped: true }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false, animation: false, devicePixelRatio: window.devicePixelRatio || 1,
                plugins: {
                    tooltip: { callbacks: { title: function(tooltipItems) { if (tooltipItems.length > 0) { const seconds = tooltipItems[0].parsed.x / 1000; return `Tiempo: ${formatTime(Math.round(seconds))}`; } return ''; } } },
                    annotation: { annotations: {} }
                },
                scales: {
                    x: { type: 'time', time: { unit: 'minute', displayFormats: { minute: 'mm:ss' } }, title: { display: true, text: 'Tiempo' } },
                    y: { type: 'linear', position: 'left', title: { display: true, text: 'Temperatura (°C) / Potencia (%)' }, suggestedMin: 0, suggestedMax: 250 },
                    y1: { type: 'linear', position: 'right', title: { display: true, text: 'RoR (°C/min)' }, grid: { drawOnChartArea: false }, suggestedMin: -20, suggestedMax: 50 }
                }
            }
        });
    }

    function updateChartData() {
        const s = state.samples[state.currentSample]; if (!roastChart || !s) return;
        const dataArray = s.data.filter(d => d.temp !== null && !d.adjustment).sort((a,b) => a.time - b.time);
        
        const eventTimeToIcon = {}; 
        Object.keys(s.events).forEach(key => { 
            const event = s.events[key]; 
            if(event && event.time !== undefined) { 
                eventTimeToIcon[event.time] = pointIcons[key] || 'circle'; 
            } 
        });

        // Temp Dataset
        const tempDataset = roastChart.data.datasets[0];
        tempDataset.data = dataArray.map(d => ({ x: new Date(d.time * 1000), y: d.temp }));
        tempDataset.borderColor = getSampleColor(state.currentSample);
        tempDataset.pointRadius = dataArray.map(d => eventTimeToIcon[d.time] ? 8 : 3);
        tempDataset.pointStyle = dataArray.map(d => eventTimeToIcon[d.time] || 'circle');
        tempDataset.pointBackgroundColor = getSampleColor(state.currentSample);
        
        // RoR Dataset
        const rorPoints = [];
        s.maxRoR = { value: -Infinity, time: 0 };
        if (dataArray.length > 0) {
            rorPoints.push({ x: new Date(dataArray[0].time * 1000), y: null });
        }
        for (let i = 1; i < dataArray.length; i++) {
            const prev = dataArray[i-1], curr = dataArray[i];
            const timeDiffMinutes = (curr.time - prev.time) / 60;
            const ror = timeDiffMinutes > 0 ? (curr.temp - prev.temp) / timeDiffMinutes : null;
            if(ror !== null && ror > s.maxRoR.value) { 
                s.maxRoR = { value: ror, time: curr.time }; 
            }
            rorPoints.push({ x: new Date(curr.time * 1000), y: ror });
        }
        roastChart.data.datasets[1].data = rorPoints;
        roastChart.data.datasets[1].borderColor = '#6c757d';

        // Adjustment Datasets
        const gasAdjustments = (s.adjustments || []).filter(adj => adj.type === 'gas');
        roastChart.data.datasets[2].data = gasAdjustments.map(adj => ({ x: new Date(adj.time * 1000), y: adj.value }));
        const airAdjustments = (s.adjustments || []).filter(adj => adj.type === 'air');
        roastChart.data.datasets[3].data = airAdjustments.map(adj => ({ x: new Date(adj.time * 1000), y: adj.value }));

        // Annotations
        const annotations = {};
        Object.keys(s.events).forEach(key => { 
            const event = s.events[key]; 
            if(event.time === undefined || event.temp === null) return; 
            annotations[key] = { 
                type: 'line', 
                xMin: new Date(event.time * 1000), 
                xMax: new Date(event.time * 1000), 
                borderColor: 'rgba(0,0,0,0.5)', 
                borderWidth: 1, 
                borderDash: [6, 6], 
                label: { 
                    content: `${eventNames[key]} (${event.temp.toFixed(1)}°C)`, 
                    display: true, 
                    position: 'start',
                    yAdjust: -15,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    padding: 4,
                    borderRadius: 4
                } 
            }; 
        });
        if (s.maxRoR.value > -Infinity) { 
            annotations.maxRoR = { 
                type: 'point', 
                xValue: new Date(s.maxRoR.time * 1000), 
                yValue: s.maxRoR.value, 
                yScaleID: 'y1', 
                backgroundColor: 'red', 
                radius: 5, 
                label: { 
                    content: `Max RoR: ${s.maxRoR.value.toFixed(1)}`, 
                    display: true, 
                    position: 'start',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    padding: 4,
                    borderRadius: 4
                } 
            }; 
        }
        roastChart.options.plugins.annotation.annotations = annotations;
        
        roastChart.update('none');
        verificarEstadoTueste(s);
    }
    
    function populateDataLogTable() {
        const s = state.samples[state.currentSample];
        allDOMElements.dataLogBody.innerHTML = '';
        if (!s) return;

        if ((state.mode === 'live' || state.mode === 'manual') && s.data.length === 0) {
            s.data = createLiveModeData();
        }

        const eventTimeMap = {};
        Object.keys(s.events).forEach(key => {
            const event = s.events[key];
            if (event && event.time !== undefined) {
                eventTimeMap[event.time] = { type: key, temp: event.temp };
            }
        });

        s.data.forEach((dataPoint) => {
            const row = document.createElement('tr');
            row.dataset.time = dataPoint.time;

            const eventInfo = eventTimeMap[dataPoint.time];
            if (eventInfo && eventInfo.temp === dataPoint.temp) {
                row.classList.add('event-row', eventKeyToCssClass[eventInfo.type]);
            }

            let tempCellContent = dataPoint.temp !== null ? dataPoint.temp.toFixed(1) : '';

            if (dataPoint.adjustment) {
                const adj = dataPoint.adjustment;
                if (adj.type === 'gas') {
                    row.classList.add('event-row-gas');
                    tempCellContent += ` (Gas: ${adj.value} mbar)`;
                } else if (adj.type === 'air') {
                    row.classList.add('event-row-air');
                    tempCellContent += ` (Aire: ${adj.value}%)`;
                }
            }

            row.innerHTML = `<td class="time-cell">${formatTime(dataPoint.time)}</td><td class="temp-cell">${tempCellContent}</td>`;
            allDOMElements.dataLogBody.appendChild(row);
        });
    }

    function updateSummary(sampleId) { const s = state.samples[sampleId]; if (!s) return; const { info, events } = s; const greenWeight = parseFloat(info.greenWeight), roastedWeight = parseFloat(info.roastedWeight); const lossEl = document.getElementById(`loss-${sampleId}`), devTimeEl = document.getElementById(`dev-time-${sampleId}`), dtrEl = document.getElementById(`dtr-${sampleId}`); if (!lossEl) return; lossEl.textContent = (greenWeight > 0 && roastedWeight > 0) ? `${((greenWeight - roastedWeight) / greenWeight * 100).toFixed(2)} %` : '-'; if (events.crack && events.end) { const devTime = events.end.time - events.crack.time, totalTime = events.end.time; devTimeEl.textContent = formatTime(devTime > 0 ? devTime : 0); dtrEl.textContent = totalTime > 0 && devTime > 0 ? `${(devTime / totalTime * 100).toFixed(1)} %` : '-'; } else { devTimeEl.textContent = '-'; dtrEl.textContent = '-'; } }
    function rebuildSampleUI() { const { tabButtonsContainer, infoPanelsContainer } = allDOMElements; tabButtonsContainer.querySelectorAll('.tab-button').forEach(button => button.remove()); infoPanelsContainer.innerHTML = ''; Object.keys(state.samples).forEach(id => createUIForSingleSample(id)); }
    function createUIForSingleSample(id) { const { tabButtonsContainer, infoPanelsContainer, addSampleBtn } = allDOMElements; const btn = document.createElement('button'); btn.className = 'tab-button'; btn.dataset.sample = id; btn.textContent = `Muestra ${id}`; btn.addEventListener('click', () => switchSample(id)); tabButtonsContainer.insertBefore(btn, addSampleBtn); const p = document.createElement('div'); p.id = `info-panel-${id}`; p.className = 'info-panel'; p.innerHTML = `<div class="field"><label>Variedad:</label><input data-field="variety" type="text"></div><div class="field"><label>Productor:</label><input data-field="producer" type="text"></div><div class="field"><label>Beneficio:</label><input data-field="process" type="text"></div><div class="field"><label>Peso Almendra (g):</label><input type="number" step="0.1" data-field="greenWeight"></div><div class="field"><label>Humedad Almendra (%):</label><input type="number" step="0.1" data-field="greenMoisture"></div><div class="field"><label>Densidad (g/ml):</label><input type="number" step="0.01" data-field="density"></div><div class="field"><label>Peso Tostado (g):</label><input type="number" step="0.1" data-field="roastedWeight"></div><div class="field summary-field"><strong>Pérdida de Peso:</strong><span id="loss-${id}">-</span></div><div class="field summary-field"><strong>Tiempo Desarrollo:</strong><span id="dev-time-${id}">-</span></div><div class="field summary-field"><strong>Ratio Desarrollo (DTR):</strong><span id="dtr-${id}">-</span></div>`; infoPanelsContainer.appendChild(p); }
    function openReportChoiceModal() { const { reportChoiceModal, reportChoiceBody } = allDOMElements; reportChoiceBody.innerHTML = ''; const samplesWithData = Object.keys(state.samples).filter(id => state.samples[id].data.filter(d => d.temp !== null).length > 0); samplesWithData.forEach(id => { const btn = document.createElement('button'); btn.textContent = `Informe Individual - Muestra ${id}`; btn.style.backgroundColor = getSampleColor(id); btn.style.color = 'white'; btn.onclick = () => { generateSingleReport(id); reportChoiceModal.classList.remove('visible'); }; reportChoiceBody.appendChild(btn); }); const consolidatedBtn = document.createElement('button'); consolidatedBtn.textContent = 'Informe Consolidado'; consolidatedBtn.disabled = samplesWithData.length < 1; consolidatedBtn.onclick = () => { generateConsolidatedReport(); reportChoiceModal.classList.remove('visible'); }; reportChoiceBody.appendChild(document.createElement('hr')); reportChoiceBody.appendChild(consolidatedBtn); reportChoiceModal.classList.add('visible'); }
    async function generateSingleReport(id) { const { reportModal, reportBody, reportTitle, reportButtonsContainer } = allDOMElements; reportTitle.textContent = `Informe Individual - Muestra ${id}`; reportButtonsContainer.innerHTML = `<button id="print-report-btn-s">Imprimir</button><button id="export-json-btn-s">Exportar a JSON</button><button id="export-csv-individual-btn-s">Exportar a CSV</button><button id="close-report-btn-s">Cerrar</button>`; document.getElementById('print-report-btn-s').onclick = () => window.print(); document.getElementById('close-report-btn-s').onclick = () => reportModal.classList.remove('visible'); document.getElementById('export-json-btn-s').onclick = () => exportProfileToJSON(id); document.getElementById('export-csv-individual-btn-s').onclick = () => exportSingleToCSV(id); reportBody.innerHTML = 'Generando...'; reportModal.classList.add('visible'); const sample = state.samples[id]; const { info, events, data, maxRoR } = sample; const asistenteAvisos = analizarPerfilCompleto(sample); const devTime = (events.crack && events.end) ? events.end.time - events.crack.time : 0; const filteredData = data.filter(d => d.temp !== null && !d.adjustment); const totalTime = events.end ? events.end.time : (filteredData.length > 0 ? filteredData[filteredData.length - 1].time : 0); const dtr = totalTime > 0 && devTime > 0 ? (devTime/totalTime*100).toFixed(1) : '0.0'; const loss = (info.greenWeight && info.roastedWeight) ? ((info.greenWeight-info.roastedWeight)/info.greenWeight*100).toFixed(2) : '0.00'; let logTableHtml = '<div class="report-log-container"><table class="report-table report-log-table"><thead><tr><th>Tiempo</th><th>Temp. (°C)</th><th>RoR (°C/min)</th></tr></thead><tbody>'; for (let i = 0; i < filteredData.length; i++) { const curr = filteredData[i]; let ror = '-'; if (i > 0) { const prev = filteredData[i-1]; const timeDiffMinutes = (curr.time - prev.time) / 60; if(timeDiffMinutes > 0) { ror = ((curr.temp - prev.temp) / timeDiffMinutes).toFixed(1); } } logTableHtml += `<tr><td>${formatTime(curr.time)}</td><td>${curr.temp.toFixed(1)}</td><td>${ror}</td></tr>`; } logTableHtml += '</tbody></table></div>'; let asistenteHtml = ''; if (asistenteAvisos && asistenteAvisos.length > 0) { asistenteHtml = `<div class="report-asistente-section"><h4>Observaciones del Asistente</h4>`; asistenteAvisos.forEach(aviso => { asistenteHtml += `<div class="aviso aviso-${aviso.tipoMensaje}">${aviso.texto}</div>`; }); asistenteHtml += `</div>`; } else { asistenteHtml = `<div class="report-asistente-section"><h4>Observaciones del Asistente</h4><p>No se registraron desviaciones significativas del perfil ideal durante este tueste.</p></div>`; } const img = await generateChartImageForReport(id, data, sample.adjustments); const html = `<section class="report-single-section" style="border-left: 5px solid ${getSampleColor(id)}"><table class="report-table"><tr><td>Variedad</td><td>${info.variety||'-'}</td></tr><tr><td>Productor</td><td>${info.producer||'-'}</td></tr><tr><td>Beneficio</td><td>${info.process||'-'}</td></tr><tr><td>Peso Almendra</td><td>${info.greenWeight||'-'} g</td></tr><tr><td>Humedad Almendra</td><td>${info.greenMoisture||'-'} %</td></tr><tr><td>Densidad</td><td>${info.density||'-'} g/ml</td></tr><tr><td>Peso Tostado</td><td>${info.roastedWeight||'-'} g</td></tr><tr><td><strong>Pérdida de Peso</strong></td><td><strong>${loss} %</strong></td></tr><tr><td>Tiempo Total</td><td>${formatTime(totalTime)}</td></tr><tr><td>Tiempo Desarrollo</td><td>${formatTime(devTime>0?devTime:0)}</td></tr><tr><td><strong>Ratio Desarrollo (DTR)</strong></td><td><strong>${dtr} %</strong></td></tr><tr><td><strong>RoR Máximo</strong></td><td><strong>${maxRoR.value > -Infinity ? maxRoR.value.toFixed(1) : '-'}</strong></td></tr></table><div class="chart-container"><img src="${img}" alt="Gráfica Muestra ${id}" class="report-single-graph"></div>${asistenteHtml}${logTableHtml}</section>`; reportBody.innerHTML = html; }
    async function generateConsolidatedReport() { const { reportModal, reportBody, reportTitle, reportButtonsContainer } = allDOMElements; reportTitle.textContent = 'Informe de Tueste Consolidado'; reportButtonsContainer.innerHTML = `<button id="print-report-btn-c">Imprimir</button><button id="export-csv-consolidated-btn-c">Exportar Todo a CSV</button><button id="close-report-btn-c">Cerrar</button>`; document.getElementById('print-report-btn-c').onclick = () => window.print(); document.getElementById('close-report-btn-c').onclick = () => reportModal.classList.remove('visible'); document.getElementById('export-csv-consolidated-btn-c').onclick = () => exportConsolidatedToCSV(); reportBody.innerHTML = 'Generando...'; reportModal.classList.add('visible'); const samplesWithData = Object.keys(state.samples).filter(id => state.samples[id].data.filter(d => d.temp !== null).length > 0); if (samplesWithData.length === 0) { reportBody.innerHTML = '<p>No hay tuestes para reportar.</p>'; return; } const tableHeaders = samplesWithData.map(id => `<th style="background-color:${getSampleColor(id)}; color:white;">MUESTRA ${id}</th>`).join(''); const infoFields = [ { label: 'Variedad', key: 'variety' }, { label: 'Productor', key: 'producer' }, { label: 'Beneficio', key: 'process' }, { label: 'Peso Almendra (g)', key: 'greenWeight' }, { label: 'Humedad Almendra (%)', key: 'greenMoisture' }, { label: 'Densidad (g/ml)', key: 'density' }, { label: 'Peso Tostado (g)', key: 'roastedWeight' } ]; let summaryRows = infoFields.map(field => `<tr><td>${field.label}</td>${samplesWithData.map(id => `<td class="value-cell">${state.samples[id].info[field.key] || '-'}</td>`).join('')}</tr>`).join(''); const lossRow = `<tr><td><strong>Pérdida de Peso (%)</strong></td>${samplesWithData.map(id => { const {greenWeight, roastedWeight} = state.samples[id].info; return `<td class="value-cell">${(greenWeight > 0 && roastedWeight > 0) ? ((greenWeight - roastedWeight) / greenWeight * 100).toFixed(2) : '-'}</td>`}).join('')}</tr>`; const devTimeRow = `<tr><td>Tiempo Desarrollo</td>${samplesWithData.map(id => { const {crack, end} = state.samples[id].events; const devTime = (crack && end) ? end.time - crack.time : 0; return `<td class="value-cell">${formatTime(devTime > 0 ? devTime : 0)}</td>`}).join('')}</tr>`; const dtrRow = `<tr><td><strong>Ratio Desarrollo (DTR) (%)</strong></td>${samplesWithData.map(id => { const {crack, end} = state.samples[id].events; const devTime = (crack && end) ? end.time - crack.time : 0; const totalTime = end ? end.time : 0; return `<td class="value-cell">${(totalTime > 0 && devTime > 0) ? (devTime / totalTime * 100).toFixed(1) : '-'}</td>`}).join('')}</tr>`; summaryRows += lossRow + devTimeRow + dtrRow; let eventRows = eventOrder.map(key => `<tr><td>${eventNames[key]}</td>${samplesWithData.map(id => { const event = state.samples[id].events[key]; return `<td class="value-cell">${event ? `${formatTime(event.time)} - ${event.temp.toFixed(1)}°C` : '-'}</td>`; }).join('')}</tr>`).join(''); let maxRoRRow = `<tr><td><strong>RoR Máximo</strong></td>${samplesWithData.map(id => `<td class="value-cell">${state.samples[id].maxRoR.value > -Infinity ? state.samples[id].maxRoR.value.toFixed(1) : '-'}</td>`).join('')}</tr>`; const summaryTable = `<div class="print-page"><table class="report-table"><thead><tr><th>DATOS Y RESULTADOS</th>${tableHeaders}</tr></thead><tbody>${summaryRows}${eventRows}${maxRoRRow}</tbody></table></div>`; let maxTime = 0; samplesWithData.forEach(id => { const s = state.samples[id]; const lastDataPoint = s.data.filter(d=>d.temp!==null).pop(); if (lastDataPoint && lastDataPoint.time > maxTime) maxTime = lastDataPoint.time; }); let logRows = ''; for(let t = 0; t <= maxTime; t += LOG_INTERVAL) { let row = `<tr><td>${formatTime(t)}</td>`; samplesWithData.forEach(id => { const dataPoint = state.samples[id].data.find(d => d.time === t); row += `<td class="value-cell">${dataPoint && dataPoint.temp !== null ? dataPoint.temp.toFixed(1) : ''}</td>`; }); row += '</tr>'; logRows += row; } const logTable = `<div class="print-page"><div class="report-log-container"><table class="report-table report-log-table"><thead><tr><th>TIEMPO</th>${tableHeaders}</tr></thead><tbody>${logRows}</tbody></table></div></div>`; const graphPage = `<div class="print-page print-graph-page"><div class="report-graph-container"><h3>GRÁFICA DEL PERFIL DE TUESTE</h3><div class="chart-container"><canvas id="consolidated-report-chart"></canvas></div></div></div>`; reportBody.innerHTML = `<div class="report-container">${summaryTable}${logTable}${graphPage}</div>`; const datasets = samplesWithData.map(id => { const s = state.samples[id]; const dataArray = s.data.filter(d => d.temp !== null && !d.adjustment).sort((a,b) => a.time - b.time); const eventTimeToIcon = {}; Object.keys(s.events).forEach(key => { const event = s.events[key]; if(event && event.time !== undefined) { eventTimeToIcon[event.time] = pointIcons[key] || 'circle'; } }); return { label: `Muestra ${id}`, data: dataArray.map(d => ({ x: d.time * 1000, y: d.temp })), borderColor: getSampleColor(id), tension: 0.1, fill: false, pointRadius: dataArray.map(d => eventTimeToIcon[d.time] ? 8 : 3), pointStyle: dataArray.map(d => eventTimeToIcon[d.time] || 'circle'), pointBackgroundColor: getSampleColor(id) }; }); const ctx = document.getElementById('consolidated-report-chart').getContext('2d'); new Chart(ctx, { type: 'line', data: { datasets }, options: { responsive: true, maintainAspectRatio: false, animation: false, scales: { x: { type: 'time', time: { parser: 'mm:ss', unit: 'minute', displayFormats: { minute: 'mm:ss' } }, title: { display: true, text: 'Tiempo' } }, y: { suggestedMin: 100, suggestedMax: 240, title: { display: true, text: 'Temperatura (°C)'} } } } }); }
    
    async function generateChartImageForReport(id, data, adjustments) {
        const filteredData = data.filter(d => d.temp !== null && !d.adjustment);
        const gasData = (adjustments || []).filter(adj => adj.type === 'gas').map(adj => ({x: new Date(adj.time * 1000), y: adj.value}));
        const airData = (adjustments || []).filter(adj => adj.type === 'air').map(adj => ({x: new Date(adj.time * 1000), y: adj.value}));
        
        return new Promise(resolve => {
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 500;
            const ctx = canvas.getContext('2d');
            
            const rorPoints = [];
            if (filteredData.length > 0) {
                rorPoints.push({ x: new Date(filteredData[0].time * 1000), y: null });
            }
            for (let i = 1; i < filteredData.length; i++) {
                const p = filteredData[i-1], c = filteredData[i], t = (c.time-p.time)/60;
                rorPoints.push({ x: new Date(c.time * 1000), y: t > 0 ? (c.temp-p.temp)/t : null });
            }

            new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: [
                        { label: 'Temp. Grano (°C)', data: filteredData.map(d => ({x: new Date(d.time * 1000), y: d.temp})), borderColor: getSampleColor(id), yAxisID: 'y', tension: 0.1 },
                        { label: 'RoR (°C/min)', data: rorPoints, borderColor: '#6c757d', borderDash: [5, 5], yAxisID: 'y1', tension: 0.1 },
                        { label: 'Gas (mbar)', data: gasData, borderColor: 'hotpink', backgroundColor: 'rgba(255, 105, 180, 0.15)', yAxisID: 'y', stepped: true, fill: true },
                        { label: 'Aire (%)', data: airData, borderColor: 'red', backgroundColor: 'rgba(255, 0, 0, 0.15)', yAxisID: 'y', stepped: true, fill: true }
                    ]
                },
                options: {
                    responsive: false,
                    maintainAspectRatio: false,
                    animation: { duration: 0 },
                    devicePixelRatio: 2,
                    scales: {
                        x: { type: 'time', time: { unit: 'minute', displayFormats: { minute: 'mm:ss' } }, title: { display: true, text: 'Tiempo' } },
                        y: { type: 'linear', position: 'left', title: { display: true, text: 'Temperatura (°C) / Potencia (%)' }, suggestedMin: 0, suggestedMax: 250 },
                        y1: { type: 'linear', position: 'right', title: { display: true, text: 'RoR (°C/min)' }, grid: { drawOnChartArea: false }, suggestedMin: -80, suggestedMax: 60 }
                    }
                },
                plugins: [{
                    id: 'custom_canvas_background_color',
                    beforeDraw: (chart) => {
                        const {ctx} = chart;
                        ctx.save();
                        ctx.globalCompositeOperation = 'destination-over';
                        ctx.fillStyle = 'white';
                        ctx.fillRect(0, 0, chart.width, chart.height);
                        ctx.restore();
                    }
                }]
            });
            setTimeout(() => resolve(canvas.toDataURL('image/png')), 500);
        });
    }

    function exportProfileToJSON(sampleId) { const s = state.samples[sampleId]; s.asistenteAvisos = analizarPerfilCompleto(s); const dataToExport = JSON.stringify(s, null, 2); const blob = new Blob([dataToExport], {type: "application/json"}); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `Muestra_${sampleId}_Perfil.json`); document.body.appendChild(link); link.click(); document.body.removeChild(link); }
    function exportSingleToCSV(sampleId) { const s = state.samples[sampleId]; const dataToExport = s.data.filter(d => d.temp !== null && !d.adjustment).sort((a, b) => a.time - b.time); if (dataToExport.length === 0) { alert('No hay datos para exportar.'); return; } let csvContent = 'tiempo,temperatura\n'; dataToExport.forEach(d => { csvContent += `${d.time},${d.temp.toFixed(1)}\n`; }); const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `Muestra_${sampleId}_Datos.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); }
    function exportConsolidatedToCSV() { const samplesWithData = Object.keys(state.samples).filter(id => state.samples[id].data.filter(d => d.temp !== null).length > 0); if (samplesWithData.length === 0) { alert('No hay datos para exportar.'); return; } let maxTime = 0; samplesWithData.forEach(id => { const s = state.samples[id]; const lastDataPoint = s.data.filter(d=>d.temp!==null && !d.adjustment).pop(); if (lastDataPoint && lastDataPoint.time > maxTime) maxTime = lastDataPoint.time; }); let csvContent = `tiempo,${samplesWithData.map(id => `temp_${id}`).join(',')}\n`; let logRows = ''; for(let t = 0; t <= maxTime; t += LOG_INTERVAL) { let row = `${t}`; samplesWithData.forEach(id => { const dataPoint = state.samples[id].data.find(d => d.time === t && !d.adjustment); row += `,${dataPoint && dataPoint.temp !== null ? dataPoint.temp.toFixed(1) : ''}`; }); logRows += `${row}\n`; } csvContent += logRows; const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `Informe_Consolidado.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); }
    function formatTime(s) { return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`; }
    function parseTimeToSeconds(timeStr) { const p = timeStr.match(/^(\d+):(\d{2})$/); return p ? parseInt(p[1], 10)*60 + parseInt(p[2], 10) : null; }
    

    // --- INTEGRACIÓN GOOGLE SHEETS (GUARDAR Y CARGAR) ---
    const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbxWy3FIVcqhV4-yfS2EPCXgV-T_XSBnVFt3GCmO1hJfjTQh9macTesB7aomkR3EE227JQ/exec";

    // 1. Guardar muestra actual en la nube
    const saveCloudBtn = document.getElementById('save-cloud-btn');
    if (saveCloudBtn) {
        saveCloudBtn.addEventListener('click', () => {
            const s = state.samples[state.currentSample];
            const devTime = (s.events.crack && s.events.end) ? s.events.end.time - s.events.crack.time : 0;
            const filteredData = s.data.filter(d => d.temp !== null && !d.adjustment);
            const totalTime = s.events.end ? s.events.end.time : (filteredData.length > 0 ? filteredData[filteredData.length - 1].time : 0);
            const dtr = totalTime > 0 && devTime > 0 ? (devTime / totalTime * 100).toFixed(1) : '0.0';
            const loss = (s.info.greenWeight && s.info.roastedWeight) ? ((s.info.greenWeight - s.info.roastedWeight) / s.info.greenWeight * 100).toFixed(2) : '0.00';

            const payload = {
                sampleId: state.currentSample,
                info: s.info,
                events: s.events,
                loss: loss,
                devTime: devTime,
                dtr: dtr,
                maxRoR: s.maxRoR.value > -Infinity ? s.maxRoR.value.toFixed(1) : '',
                rawSample: s
            };

            const textoOriginal = saveCloudBtn.textContent;
            saveCloudBtn.textContent = "Guardando...";
            saveCloudBtn.disabled = true;

            fetch(URL_APPS_SCRIPT, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === "éxito") {
                    alert(`¡Muestra ${state.currentSample} guardada en Google Sheets con éxito!`);
                } else {
                    alert("Hubo un problema al guardar: " + data.mensaje);
                }
            })
            .catch(error => {
                alert("Error de conexión al guardar. Verifica los permisos de Apps Script.");
                console.error("Error:", error);
            })
            .finally(() => {
                saveCloudBtn.textContent = textoOriginal;
                saveCloudBtn.disabled = false;
            });
        });
    }

    // 2. Cargar lista desde la nube
    const cloudModal = document.getElementById('cloud-load-modal');
    const closeCloudModalBtn = document.getElementById('close-cloud-modal');
    const cloudLoadBody = document.getElementById('cloud-load-body');
    const loadCloudBtn = document.getElementById('load-cloud-btn');

    if (closeCloudModalBtn && cloudModal) {
        closeCloudModalBtn.addEventListener('click', () => cloudModal.classList.remove('visible'));
    }

    if (loadCloudBtn && cloudModal && cloudLoadBody) {
        loadCloudBtn.addEventListener('click', () => {
            cloudModal.classList.add('visible');
            cloudLoadBody.innerHTML = '<p>Consultando base de datos en Google Sheets...</p>';

            fetch(URL_APPS_SCRIPT + "?action=list", { method: 'GET' })
            .then(response => response.json())
            .then(data => {
                if (data.status === "éxito") {
                    if (!data.list || data.list.length === 0) {
                        cloudLoadBody.innerHTML = '<p>No hay tuestes registrados aún en la nube.</p>';
                        return;
                    }

                    let tableHTML = '<table class="report-table" style="width: 100%; border-collapse: collapse;">';
                    tableHTML += '<thead><tr><th>Fila</th><th>Fecha</th><th>Muestra</th><th>Productor</th><th>Variedad</th><th>Acción</th></tr></thead><tbody>';
                    
                    data.list.forEach(item => {
                        tableHTML += `<tr>
                            <td style="text-align:center; padding: 6px;">${item.row}</td>
                            <td style="text-align:center; padding: 6px;">${item.date}</td>
                            <td style="text-align:center; padding: 6px;"><b>${item.sampleId}</b></td>
                            <td style="text-align:center; padding: 6px;">${item.producer || '-'}</td>
                            <td style="text-align:center; padding: 6px;">${item.variety || '-'}</td>
                            <td style="text-align:center; padding: 6px;"><button class="load-specific-row-btn" data-row="${item.row}" style="background-color: var(--color-a); color: white; padding: 5px 12px; cursor: pointer; border-radius: 4px; border:none; font-weight: bold;">Cargar en Muestra ${state.currentSample}</button></td>
                        </tr>`;
                    });
                    tableHTML += '</tbody></table>';
                    cloudLoadBody.innerHTML = tableHTML;

                    document.querySelectorAll('.load-specific-row-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const rowToLoad = e.target.getAttribute('data-row');
                            cargarTuesteEspecifico(rowToLoad);
                        });
                    });

                } else {
                    cloudLoadBody.innerHTML = `<p style="color:red;">Error: ${data.mensaje}</p>`;
                }
            })
            .catch(error => {
                cloudLoadBody.innerHTML = `<p style="color:red;">Error de conexión. Verifica la implementación pública de Apps Script.</p>`;
                console.error("Error:", error);
            });
        });
    }

    function cargarTuesteEspecifico(row) {
        if (!confirm("Esto reemplazará los datos de la Muestra actual (" + state.currentSample + ") con el tueste seleccionado. ¿Deseas continuar?")) return;
        
        cloudLoadBody.innerHTML = '<p>Descargando perfil del tueste y graficando curva...</p>';

        fetch(URL_APPS_SCRIPT + "?action=load&row=" + row, { method: 'GET' })
        .then(response => response.json())
        .then(data => {
            if (data.status === "éxito") {
                try {
                    const importedProfile = JSON.parse(data.data);
                    const s = state.samples[state.currentSample];
                    Object.assign(s, createEmptySample());
                    Object.assign(s, importedProfile);
                    s.asistenteAvisos = s.asistenteAvisos || [];
                    s.adjustments = s.adjustments || [];
                    updateUI();
                    restoreInfoInputs(state.currentSample);
                    cloudModal.classList.remove('visible');
                    alert("¡Tueste cargado exitosamente en la Muestra " + state.currentSample + "!");
                } catch(e) {
                    cloudLoadBody.innerHTML = `<p style="color:red;">Error al procesar el perfil guardado.</p>`;
                    console.error(e);
                }
            } else {
                cloudLoadBody.innerHTML = `<p style="color:red;">Error: ${data.mensaje}</p>`;
            }
        })
        .catch(error => {
            cloudLoadBody.innerHTML = `<p style="color:red;">Error de conexión al descargar el perfil.</p>`;
            console.error("Error:", error);
        });
    }

    initialize();
});
// Ensure gas display shows 100% at start
try { document.getElementById('gas-value-display').textContent = '100 %'; } catch(e){}
