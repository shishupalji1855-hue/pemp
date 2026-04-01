
document.addEventListener('DOMContentLoaded', () => {
    const qrLinkInput = document.getElementById('qr-link');
    const generateQrBtn = document.getElementById('generate-qr');
    const qrUploadInput = document.getElementById('qr-upload');
    const transparencyToggle = document.getElementById('transparency-toggle');
    const colorPalette = document.getElementById('color-palette');
    const qrCanvas = document.getElementById('qr-canvas');
    const exportPngBtn = document.getElementById('export-png');
    const qrPreview = document.getElementById('qr-preview');
    const loadingSpinner = document.getElementById('loading-spinner');

    const ctx = qrCanvas.getContext('2d', { willReadFrequently: true });
    let qrcode = null;
    let originalImageData = null;

    const showLoading = () => loadingSpinner.classList.remove('hidden');
    const hideLoading = () => loadingSpinner.classList.add('hidden');

    const clearCanvas = () => {
        ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
        originalImageData = null;
    };

    const updatePreview = () => {
        const previewImg = qrPreview.querySelector('img') || new Image();
        previewImg.src = qrCanvas.toDataURL('image/png');
        previewImg.style.width = '100%';
        previewImg.style.height = '100%';
        if (!qrPreview.contains(previewImg)) {
            qrPreview.innerHTML = '';
            qrPreview.appendChild(previewImg);
        }
    };

    const drawInstructionText = (color = '#000000') => {
        ctx.save();
        ctx.fillStyle = color;
        // Use Montserrat from Google Fonts
        ctx.font = 'bold 120px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Scan karein aur 5 second wait karein', 2000, 3900);
        ctx.restore();
    };

    const processQR = async (imgSource, isUpload = false) => {
        showLoading();
        // Use requestAnimationFrame to let the UI update (show spinner)
        await new Promise(resolve => requestAnimationFrame(resolve));

        clearCanvas();
        if (isUpload) {
            ctx.drawImage(imgSource, 0, 0, 4000, 4000);
        } else {
            ctx.drawImage(imgSource, 0, 0, 4000, 3750);
            drawInstructionText(colorPalette.value);
        }

        originalImageData = ctx.getImageData(0, 0, qrCanvas.width, qrCanvas.height);
        
        // Apply current filters
        applyFilters();
        
        updatePreview();
        hideLoading();
    };

    const applyFilters = () => {
        if (!originalImageData) return;

        const newColor = colorPalette.value;
        const hexToRgb = (hex) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return { r, g, b };
        };
        const targetRgb = hexToRgb(newColor);
        
        const imageData = new ImageData(new Uint8ClampedArray(originalImageData.data), 4000, 4000);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const alpha = data[i + 3];

            // 1. Transparency Engine (Alpha Masking)
            // If pixel is white or very light, make it transparent
            if (transparencyToggle.checked) {
                const brightness = (r + g + b) / 3;
                if (brightness > 220) {
                    data[i + 3] = 0;
                    continue;
                }
            }

            // 2. Color Re-mapping (Black to Designer Palette)
            // If pixel is dark (part of QR or Text), change its color
            const isDark = (r < 150 && g < 150 && b < 150);
            if (isDark && alpha > 0) {
                data[i] = targetRgb.r;
                data[i + 1] = targetRgb.g;
                data[i + 2] = targetRgb.b;
            }
        }

        ctx.putImageData(imageData, 0, 0);
    };

    generateQrBtn.addEventListener('click', () => {
        const link = qrLinkInput.value.trim();
        if (!link) return;

        const qrCodeContainer = document.createElement('div');
        qrcode = new QRCode(qrCodeContainer, {
            text: link,
            width: 4000,
            height: 4000,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // Wait for QRCode.js to render the image
        const checkInterval = setInterval(() => {
            const qrImg = qrCodeContainer.querySelector('img');
            if (qrImg && qrImg.complete) {
                clearInterval(checkInterval);
                processQR(qrImg);
            }
        }, 100);
    });

    qrUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => processQR(img, true);
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    transparencyToggle.addEventListener('change', () => {
        if (!originalImageData) return;
        showLoading();
        setTimeout(() => {
            applyFilters();
            updatePreview();
            hideLoading();
        }, 50);
    });

    colorPalette.addEventListener('change', () => {
        if (!originalImageData) return;
        showLoading();
        setTimeout(() => {
            applyFilters();
            updatePreview();
            hideLoading();
        }, 50);
    });

    exportPngBtn.addEventListener('click', () => {
        if (!originalImageData) return;
        const link = document.createElement('a');
        link.download = `ProQR_${colorPalette.options[colorPalette.selectedIndex].text.replace(' ', '_')}.png`;
        link.href = qrCanvas.toDataURL('image/png');
        link.click();
    });
});
