
document.addEventListener('DOMContentLoaded', () => {
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

    const ctx = qrCanvas.getContext('2d', { willReadFrequently: true });
    let qrcode = null;
    let originalImageData = null;
    let currentColor = colorPalette.value;

    const showLoading = () => loadingSpinner.classList.remove('hidden');
    const hideLoading = () => loadingSpinner.classList.add('hidden');

    const clearCanvas = () => {
        ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
        originalImageData = null;
    };

    const cleanYouTubeUrl = (url) => {
        try {
            const urlObj = new URL(url);
            let videoId = '';
            
            if (urlObj.hostname === 'youtu.be') {
                videoId = urlObj.pathname.slice(1);
            } else if (urlObj.hostname.includes('youtube.com')) {
                if (urlObj.pathname.includes('/shorts/')) {
                    videoId = urlObj.pathname.split('/shorts/')[1].split('?')[0];
                } else {
                    videoId = urlObj.searchParams.get('v');
                }
            }
            
            if (videoId) {
                return `https://youtu.be/${videoId}`;
            }
            return url;
        } catch (e) {
            return url;
        }
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
        ctx.font = 'bold 120px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Scan karein aur 5 second wait karein', 2000, 3900);
        ctx.restore();
    };

    const processQR = async (imgSource, isUpload = false) => {
        showLoading();
        await new Promise(resolve => requestAnimationFrame(resolve));

        clearCanvas();
        if (isUpload) {
            ctx.drawImage(imgSource, 0, 0, 4000, 4000);
        } else {
            ctx.drawImage(imgSource, 0, 0, 4000, 3750);
            drawInstructionText(currentColor);
        }

        originalImageData = ctx.getImageData(0, 0, qrCanvas.width, qrCanvas.height);
        applyFilters();
        updatePreview();
        hideLoading();
    };

    const applyFilters = () => {
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
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const alpha = data[i + 3];

            if (transparencyToggle.checked) {
                const brightness = (r + g + b) / 3;
                if (brightness > 220) {
                    data[i + 3] = 0;
                    continue;
                }
            }

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
        let link = qrLinkInput.value.trim();
        if (!link) return;

        // Offline URL Cleaning for YouTube
        link = cleanYouTubeUrl(link);
        qrLinkInput.value = link; // Show cleaned link in UI

        const qrCodeContainer = document.createElement('div');
        qrcode = new QRCode(qrCodeContainer, {
            text: link,
            width: 4000,
            height: 4000,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M // Density Optimization
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
        if (colorPalette.value === 'custom') {
            customColorPicker.click();
        } else {
            currentColor = colorPalette.value;
            if (originalImageData) {
                showLoading();
                setTimeout(() => {
                    applyFilters();
                    updatePreview();
                    hideLoading();
                }, 50);
            }
        }
    });

    customColorPicker.addEventListener('input', (e) => {
        currentColor = e.target.value;
        if (originalImageData) {
            applyFilters();
            updatePreview();
        }
    });

    customColorPicker.addEventListener('change', (e) => {
        currentColor = e.target.value;
        if (originalImageData) {
            showLoading();
            setTimeout(() => {
                applyFilters();
                updatePreview();
                hideLoading();
            }, 50);
        }
    });

    exportPngBtn.addEventListener('click', () => {
        if (!originalImageData) return;
        const link = document.createElement('a');
        const colorName = colorPalette.value === 'custom' ? 'Custom' : colorPalette.options[colorPalette.selectedIndex].text.replace(' ', '_');
        link.download = `ProQR_${colorName}.png`;
        link.href = qrCanvas.toDataURL('image/png');
        link.click();
    });
});
