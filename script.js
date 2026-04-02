
document.addEventListener('DOMContentLoaded', () => {
    // --- Element Cache ---
    const qrLinkInput = document.getElementById('qr-link');
    const generateQrBtn = document.getElementById('generate-qr');
    const qrUploadInput = document.getElementById('qr-upload');
    const transparencyToggle = document.getElementById('transparency-toggle');
    const colorPalette = document.getElementById('color-palette');
    const customColorPicker = document.getElementById('custom-color-picker');
    const qrCanvas = document.getElementById('qr-canvas');
    const exportPngBtn = document.getElementById('export-png');
    const qrPreview = document.getElementById('qr-preview');
    const loadingSpinner = document.getElementById('loading-spinner');

    // --- Canvas & State ---
    const ctx = qrCanvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false; // --- FIX: Pixel-perfect rendering
    let originalImageData = null;
    let currentColor = colorPalette.value;

    // --- UI Functions ---
    const showLoading = () => loadingSpinner.classList.remove('hidden');
    const hideLoading = () => loadingSpinner.classList.add('hidden');

    const clearCanvas = () => {
        ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
        originalImageData = null;
        qrPreview.innerHTML = ''; // Clear the image preview
    };

    // --- DUAL CANVAS LOGIC: Update the <img> tag, not the canvas visibility ---
    const updatePreview = () => {
        const previewImg = qrPreview.querySelector('img') || new Image();
        previewImg.src = qrCanvas.toDataURL('image/png');
        if (!qrPreview.contains(previewImg)) {
            qrPreview.appendChild(previewImg);
        }
    };

    // --- URL Cleaning ---
    const cleanYouTubeUrl = (url) => {
        try {
            const urlObj = new URL(url);
            let videoId = '';
            if (urlObj.hostname === 'youtu.be') {
                videoId = urlObj.pathname.slice(1).split('?')[0];
            } else if (urlObj.hostname.includes('youtube.com')) {
                if (urlObj.pathname.includes('/shorts/')) {
                    videoId = urlObj.pathname.split('/shorts/')[1].split('?')[0];
                } else {
                    videoId = urlObj.searchParams.get('v');
                }
            }
            return videoId ? `https://youtu.be/${videoId}` : url;
        } catch (e) {
            return url; // Return original URL if parsing fails
        }
    };

    // --- Core Drawing & Processing ---
    const drawInstructionText = (color) => {
        ctx.save();
        ctx.fillStyle = color;
        ctx.font = 'bold 120px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top'; // --- FIX: Prevent clipping
        // --- FIX: Added 150px safety zone (3750 + 150 = 3900)
        ctx.fillText('Scan karein aur 5 second wait karein', 2000, 3750 + 150);
        ctx.restore();
    };

    const applyFiltersAndDraw = () => {
        if (!originalImageData) return;

        const hexToRgb = (hex) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return { r, g, b };
        };
        const targetRgb = hexToRgb(currentColor);
        
        const imageData = new ImageData(new Uint8ClampedArray(originalImageData.data), 4000, 4000);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];

            if (transparencyToggle.checked) {
                if (r > 220 && g > 220 && b > 220) {
                    data[i + 3] = 0;
                    continue;
                }
            }

            if (r < 150 && g < 150 && b < 150 && a > 0) {
                data[i] = targetRgb.r;
                data[i + 1] = targetRgb.g;
                data[i + 2] = targetRgb.b;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    };

    const processQR = async (imgSource, isUpload = false) => {
        showLoading();
        await new Promise(resolve => requestAnimationFrame(resolve));

        clearCanvas();
        // Draw the base QR image
        ctx.drawImage(imgSource, 0, 0, 4000, isUpload ? 4000 : 3750);
        
        // Store this raw state before adding text
        originalImageData = ctx.getImageData(0, 0, 4000, 4000);

        // Apply color filters and draw text
        applyFiltersAndDraw();
        if (!isUpload) {
            drawInstructionText(currentColor);
        }
        
        updatePreview();
        hideLoading();
    };

    // --- Event Listeners ---
    generateQrBtn.addEventListener('click', () => {
        let link = qrLinkInput.value.trim();
        if (!link) return;

        link = cleanYouTubeUrl(link);
        qrLinkInput.value = link;

        const qrCodeContainer = document.createElement('div');
        new QRCode(qrCodeContainer, {
            text: link, width: 4000, height: 4000,
            colorDark: "#000000", colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
        });

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
            img.crossOrigin = "Anonymous"; // --- FIX: Tainted Canvas
            img.onload = () => processQR(img, true);
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    const handleFilterChange = () => {
        if (!originalImageData) return;
        showLoading();
        setTimeout(() => {
            // Re-apply filters and text on the original clean QR data
            ctx.putImageData(originalImageData, 0, 0);
            applyFiltersAndDraw();
            if (qrLinkInput.value) { // Only add text if it was a generated QR
                 drawInstructionText(currentColor);
            }
            updatePreview();
            hideLoading();
        }, 50);
    };

    transparencyToggle.addEventListener('change', handleFilterChange);

    colorPalette.addEventListener('change', () => {
        if (colorPalette.value === 'custom') {
            customColorPicker.click();
        } else {
            currentColor = colorPalette.value;
            handleFilterChange();
        }
    });

    customColorPicker.addEventListener('input', (e) => {
        currentColor = e.target.value;
        handleFilterChange();
    });

    exportPngBtn.addEventListener('click', () => {
        if (!originalImageData) return;
        const link = document.createElement('a');
        const colorName = colorPalette.value === 'custom' ? 'CustomColor' : colorPalette.options[colorPalette.selectedIndex].text.replace(' ', '_');
        link.download = `ProQR_${colorName}.png`;
        link.href = qrCanvas.toDataURL('image/png');
        link.click();
    });
});
