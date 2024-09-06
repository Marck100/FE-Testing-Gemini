const sendButton = document.getElementById('send');
const questionInput = document.getElementById('question');
const responseContainer = document.getElementById('response');
const carouselContainer = document.getElementById('carousel');
const fileInput = document.getElementById('file-input');
const uploadButton = document.getElementById('upload');

const leftArrow = document.getElementById('left-arrow');
const rightArrow = document.getElementById('right-arrow');

// Replace this with your actual API endpoint
const API_ENDPOINT = 'http://localhost:3000/ask-streaming';
const UPLOAD_ENDPOINT = 'http://localhost:3000/upload-file';


let tokens = "";
let fileId = null;

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(UPLOAD_ENDPOINT, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('File upload failed.');
    }

    const result = await response.json();
    fileId = result.id;

    // Enable question input and send button after file upload is complete
    questionInput.disabled = false;
    sendButton.disabled = false;
}

async function sendQuestion(question) {
    tokens = "";
    carouselContainer.innerHTML = '';
    const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question, id: fileId }),
    });

    if (!response.body) {
        throw new Error('ReadableStream not supported in this browser.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let done = false;
    let imageProcessing = false;

    let imagesBuffer = ''

    while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value, { stream: true });
        console.log('chunk:', chunk)
        if (imageProcessing) {
            imagesBuffer += chunk
        } else {
            const obj = JSON.parse(chunk)
            // Assuming each chunk represents a token
            console.log(obj)
            if (obj['type'] === 'answer') {
                displayToken(obj['content']);
            } else if (obj['type'] === 'end') {
                imageProcessing = true;
            }
        }

    }

    const images = JSON.parse(imagesBuffer)['content'];
    displayImages(images);
}

function displayImages(images) {
    carouselContainer.querySelectorAll('img').forEach(img => img.remove());
    images.forEach(imageBase64 => {
        const img = document.createElement('img');
        img.src = `data:image/jpeg;base64,${imageBase64}`;
        carouselContainer.appendChild(img);
    });
}


function displayToken(token) {
    tokens += token
    responseContainer.textContent = tokens;
    console.log(tokens)
    renderMarkdown()
}

uploadButton.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (file) {
        uploadFile(file).catch(error => {
            console.error('Error:', error);
            responseContainer.textContent = 'Error: ' + error.message;
        });
    }
});

sendButton.addEventListener('click', () => {
    const question = questionInput.value.trim();
    if (question) {
        responseContainer.textContent = ''; // Clear previous response
        sendQuestion(question).catch(error => {
            console.error('Error:', error);
            responseContainer.textContent = 'Error: ' + error.message;
        });
    }
});
