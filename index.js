const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

const recordings = [
    {
        streamUrl: "https://amg01024-amg01024c2-directtv-latam-5619.playouts.now.amagi.tv/playlist/amg01024-olympusatfast-freetvaccionlatam-directtvlatam/playlist.m3u8",
        output: "grabacion1.mp4",
        startTime: new Date("2024-12-27T20:41:00"),
        endTime: new Date("2024-12-27T20:42:00")
    },
];

function scheduleRecording(streamUrl, output, startTime, endTime, maxRetries = 40) {
    const now = new Date();
    if (startTime < now) return console.error(`La hora de inicio debe ser futura para la grabación: ${output}`);
    const duration = (endTime - startTime) / 1000;
    if (duration <= 0) return console.error(`La hora de fin debe ser posterior a la hora de inicio para la grabación: ${output}`);

    console.log(`Grabación programada:
    - Stream: ${streamUrl}
    - Archivo: ${output}
    - Inicio: ${startTime.toLocaleString()}
    - Fin: ${endTime.toLocaleString()}`);

    const delay = startTime - now;
    setTimeout(() => {
        console.log(`Iniciando grabación: ${output}`);
        const recordingsFolder = path.join(__dirname, 'recordings');
        if (!fs.existsSync(recordingsFolder)) fs.mkdirSync(recordingsFolder);
        const folder = path.join(recordingsFolder, path.basename(output, path.extname(output)));
        if (!fs.existsSync(folder)) fs.mkdirSync(folder);

        startRecording(streamUrl, folder, output, duration, maxRetries, 0, endTime);
    }, delay);
}

function startRecording(streamUrl, folder, name, duration, retriesLeft, partNumber, endTime) {
    const nameFile = `${path.basename(name, path.extname(name))}_${40 - retriesLeft}${path.extname(name)}`;
    const outputFile = path.join(folder, nameFile);
    const now = new Date();
    const remainingTime = (endTime - now) / 1000; 
    if (remainingTime <= 0) return console.log(`Grabación finalizada: ${folder}`);

    const recordingDuration = Math.min(duration, remainingTime);
    const ffmpegCommand = `${ffmpegPath} -i "${streamUrl}" -t ${recordingDuration} -c copy "${outputFile}"`;
    console.log("Ejecutando: " + ffmpegCommand);

    const process = exec(ffmpegCommand);
    //process.stdout.on('data', (data) => console.log(`[${outputFile}] ${data}`));
    process.stderr.on('data', (data) => console.error(`[${outputFile}] ${data}`));
    process.on('close', (code) => {
        if (code === 0) {
            console.log(`Grabación finalizada exitosamente: ${outputFile}`);
        } else if (retriesLeft > 0) {
            console.error(`Error al grabar: ${outputFile}. Reintentando (${40 - retriesLeft + 1}/40)...`);
            setTimeout(() => startRecording(streamUrl, folder, nameFile, duration, retriesLeft - 1, partNumber + 1, endTime), 2000);
        } else {
            console.error(`Grabación fallida después de 40 intentos: ${outputFile}`);
        }
    });
}

recordings.forEach(({ streamUrl, output, startTime, endTime }) => scheduleRecording(streamUrl, output, startTime, endTime));