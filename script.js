const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const preview = document.getElementById('preview');
const previewImg = document.getElementById('preview-img');
const pdfPreview = document.getElementById('pdf-preview');
const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');
const qualityInput = document.getElementById('quality');
const scaleInput = document.getElementById('scale');
const brightnessInput = document.getElementById('brightness');
const contrastInput = document.getElementById('contrast');
const rotateSelect = document.getElementById('rotate');
const flipSelect = document.getElementById('flip');
const borderTypeSelect = document.getElementById('border-type');
const borderWidthInput = document.getElementById('border-width');
const pdfToWordBtn = document.getElementById('pdf-to-word');
const wordToPdfBtn = document.getElementById('word-to-pdf');
const downloadLink = document.getElementById('download-link');
const imageControls = document.getElementById('image-controls');
const docControls = document.getElementById('doc-controls');

let originalImage = null;
let fileType = null;

// Handle drag and drop
dropArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropArea.classList.add('border-blue-600');
});

dropArea.addEventListener('dragleave', () => {
  dropArea.classList.remove('border-blue-600');
});

dropArea.addEventListener('drop', (e) => {
  e.preventDefault();
  dropArea.classList.remove('border-blue-600');
  const file = e.dataTransfer.files[0];
  handleFile(file);
});

// Handle file input
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  handleFile(file);
});

// Process uploaded file
function handleFile(file) {
  if (!file) return;

  fileType = file.type;
  preview.classList.remove('hidden');
  imageControls.classList.add('hidden');
  docControls.classList.add('hidden');
  downloadLink.classList.add('hidden');
  pdfPreview.classList.add('hidden');
  previewImg.classList.add('hidden');

  if (fileType.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = () => {
      originalImage = new Image();
      originalImage.src = reader.result;
      originalImage.onload = () => {
        previewImg.src = reader.result;
        previewImg.classList.remove('hidden');
        widthInput.value = originalImage.width;
        heightInput.value = originalImage.height;
        imageControls.classList.remove('hidden');
        updatePreview();
      };
    };
    reader.readAsDataURL(file);
  } else if (fileType === 'application/pdf' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    docControls.classList.remove('hidden');
    if (fileType === 'application/pdf') {
      renderPdfPreview(file);
    }
  } else {
    alert('Unsupported file type. Please upload an image, PDF, or DOCX file.');
  }
}

// Render PDF preview
async function renderPdfPreview(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: context, viewport }).promise;
  pdfPreview.innerHTML = '';
  pdfPreview.appendChild(canvas);
  pdfPreview.classList.remove('hidden');
}

// Update preview and prepare download
function updatePreview() {
  if (!originalImage) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  let width = parseInt(widthInput.value) || originalImage.width;
  let height = parseInt(heightInput.value) || originalImage.height;
  const scale = parseInt(scaleInput.value) / 100 || 1;
  const rotate = parseInt(rotateSelect.value) || 0;
  const flip = flipSelect.value;
  const quality = parseInt(qualityInput.value) / 100 || 0.8;
  const brightness = parseInt(brightnessInput.value) || 0;
  const contrast = parseInt(contrastInput.value) || 0;
  const borderType = borderTypeSelect.value;
  const borderWidth = parseInt(borderWidthInput.value) || 0;

  // Apply scale
  width *= scale;
  height *= scale;

  // Adjust canvas size for border and rotation
  const totalWidth = width + 2 * borderWidth;
  const totalHeight = height + 2 * borderWidth;
  if (rotate === 90 || rotate === 270) {
    canvas.width = totalHeight;
    canvas.height = totalWidth;
  } else {
    canvas.width = totalWidth;
    canvas.height = totalHeight;
  }

  // Draw border
  if (borderType === 'white') {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (borderType === 'blur') {
    // Create blurred version of the image for border
    ctx.filter = 'blur(10px)';
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
    // Draw original image area
    ctx.fillStyle = 'white';
    ctx.fillRect(borderWidth, borderWidth, width, height);
  }

  // Center and rotate
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotate * Math.PI) / 180);

  // Apply flip
  if (flip === 'horizontal') {
    ctx.scale(-1, 1);
  } else if (flip === 'vertical') {
    ctx.scale(1, -1);
  }

  // Draw image
  ctx.drawImage(originalImage, -width / 2, -height / 2, width, height);

  // Apply brightness and contrast
  if (brightness !== 0 || contrast !== 0) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      // Brightness
      data[i] = Math.min(255, Math.max(0, data[i] + brightness));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + brightness));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + brightness));

      // Contrast
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
      data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
      data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // Update preview
  previewImg.src = canvas.toDataURL();

  // Prepare download
  const mimeType = originalImage.src.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
  const dataUrl = canvas.toDataURL(mimeType, quality);
  downloadLink.href = dataUrl;
  downloadLink.download = 'processed-image.' + (mimeType === 'image/png' ? 'png' : 'jpg');
  downloadLink.classList.remove('hidden');
}

// Bind input events for live preview
[widthInput, heightInput, qualityInput, scaleInput, brightnessInput, contrastInput, rotateSelect, flipSelect, borderTypeSelect, borderWidthInput].forEach(input => {
  input.addEventListener('input', updatePreview);
  input.addEventListener('change', updatePreview);
});

// PDF to Word
pdfToWordBtn.addEventListener('click', async () => {
  if (!fileType || fileType !== 'application/pdf') {
    alert('Please upload a PDF file first.');
    return;
  }

  const file = fileInput.files[0];
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  let text = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    text += textContent.items.map(item => item.str).join(' ') + '\n';
  }

  const doc = new docx.Document({
    sections: [{
      properties: {},
      children: [
        new docx.Paragraph({
          text: text,
        }),
      ],
    }],
  });

  const blob = await docx.Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  downloadLink.href = url;
  downloadLink.download = 'converted.docx';
  downloadLink.classList.remove('hidden');
});

// Word to PDF
wordToPdfBtn.addEventListener('click', async () => {
  if (!fileType || fileType !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    alert('Please upload a DOCX file first.');
    return;
  }

  const file = fileInput.files[0];
  const arrayBuffer = await file.arrayBuffer();
  const doc = await docx.Document.fromBlob(new Blob([arrayBuffer]));
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  let y = 10;

  doc.sections.forEach(section => {
    section.children.forEach(child => {
      if (child instanceof docx.Paragraph) {
        child.textRuns.forEach(run => {
          pdf.text(run.text, 10, y);
          y += 10;
          if (y > 280) {
            pdf.addPage();
            y = 10;
          }
        });
      }
    });
  });

  const url = pdf.output('datauristring');
  downloadLink.href = url;
  downloadLink.download = 'converted.pdf';
  downloadLink.classList.remove('hidden');
});
