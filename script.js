const imgFolder = 'JPEG';
const scrollWrapper = document.getElementById('scrollWrapper');
let imageElements = [];
let oneSetWidth = 0;
let allImagesLoaded = false;

const OVERLAP_RATIO = 0.5;
const BLEND_MODES = ['multiply', 'screen', 'overlay', 'soft-light', 'hard-light', 'color-dodge', 'color-burn'];

function getImgWidth(img) {
    return img.offsetWidth || img.clientWidth || img.naturalWidth || 800;
}

function createImageElement(src) {
    const img = document.createElement('img');
    img.src = src;
    img.loading = 'eager';
    img.decoding = 'async';
    img.onerror = function() {
        this.style.display = 'none';
    };
    return img;
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function loadImages() {
    const existingImages = Array.from(scrollWrapper.querySelectorAll('img'));
    const shuffled = shuffleArray(existingImages);
    return Promise.resolve(shuffled);
}

function waitForAllImages(images, onComplete) {
    let loadedCount = 0;
    const totalImages = images.length;
    let currentLeft = 0;
    let isComplete = false;
    const MIN_IMAGES = 1;
    const TIMEOUT = 10000;
    
    if (totalImages === 0) {
        onComplete([]);
        return;
    }
    
    function calculateImagePositions() {
        if (imageElements.length === 0) return;
        
        const flipRandom = Math.random();
        imageElements.forEach((img, index) => {
            img.style.display = 'block';
            const imgWidth = getImgWidth(img);
            
            if (index > 0) {
                img.style.mixBlendMode = BLEND_MODES[index % BLEND_MODES.length];
            } else {
                img.style.mixBlendMode = 'normal';
            }
            
            if (flipRandom > 0.5) img.style.transform = 'scaleY(-1)';
            
            if (index === 0) {
                img.style.left = '0px';
                currentLeft = imgWidth * (1 - OVERLAP_RATIO);
            } else {
                img.style.left = currentLeft + 'px';
                currentLeft += imgWidth * (1 - OVERLAP_RATIO);
            }
        });
        
        const lastImgWidth = getImgWidth(imageElements[imageElements.length - 1]);
        scrollWrapper.style.width = (currentLeft + lastImgWidth * OVERLAP_RATIO) + 'px';
    }
    
    function finishLoading() {
        if (isComplete) return;
        isComplete = true;
        allImagesLoaded = true;
        
        if (imageElements.length >= MIN_IMAGES) {
            requestAnimationFrame(() => {
                calculateImagePositions();
                onComplete(imageElements);
            });
        } else {
            onComplete([]);
        }
    }
    
    const timeoutId = setTimeout(() => {
        if (imageElements.length >= MIN_IMAGES) {
            finishLoading();
        }
    }, TIMEOUT);
    
    images.forEach((img) => {
        const imageTimeout = setTimeout(() => {
            loadedCount++;
            if (loadedCount === totalImages && !isComplete) {
                clearTimeout(timeoutId);
                finishLoading();
            }
        }, 5000);
        
        if (img.complete && img.naturalHeight !== 0) {
            clearTimeout(imageTimeout);
            imageElements.push(img);
            loadedCount++;
            
            if (loadedCount === totalImages) {
                clearTimeout(timeoutId);
                finishLoading();
            } else if (loadedCount >= MIN_IMAGES && !isComplete && loadedCount === imageElements.length) {
                clearTimeout(timeoutId);
                finishLoading();
            }
        } else {
            img.onload = function() {
                clearTimeout(imageTimeout);
                if (imageElements.indexOf(img) === -1) {
                    imageElements.push(img);
                    loadedCount++;
                    
                    if (loadedCount === totalImages) {
                        clearTimeout(timeoutId);
                        finishLoading();
                    } else if (loadedCount >= MIN_IMAGES && !isComplete && loadedCount === imageElements.length) {
                        clearTimeout(timeoutId);
                        finishLoading();
                    }
                }
            };
            img.onerror = function() {
                clearTimeout(imageTimeout);
                loadedCount++;
                if (loadedCount === totalImages) {
                    clearTimeout(timeoutId);
                    finishLoading();
                } else if (loadedCount >= MIN_IMAGES && imageElements.length >= MIN_IMAGES && !isComplete) {
                    clearTimeout(timeoutId);
                    finishLoading();
                }
            };
        }
    });
}

async function initializeImages() {
    if (!scrollWrapper) return;
    
    const images = await loadImages();
    if (images.length === 0) return;
    
    return new Promise((resolve, reject) => {
        waitForAllImages(images, (loadedElements) => {
            if (loadedElements.length > 0) {
                requestAnimationFrame(() => {
                    setupInfiniteScroll();
                    resolve(loadedElements);
                });
            } else {
                reject(new Error('No images loaded'));
            }
        });
    });
}

function setupInfiniteScroll() {
    const container = document.querySelector('.scroll-container');
    const wrapper = scrollWrapper;
    
    if (imageElements.length === 0) return;
    
    oneSetWidth = 0;
    imageElements.forEach(img => {
        oneSetWidth += getImgWidth(img) * (1 - OVERLAP_RATIO);
    });
    oneSetWidth += getImgWidth(imageElements[imageElements.length - 1]) * OVERLAP_RATIO;
    
    const firstOriginalImage = imageElements[0];
    let copyLeft = -oneSetWidth;
    
    imageElements.forEach((img, index) => {
        const clone = img.cloneNode(true);
        const imgWidth = getImgWidth(img);
        
        if (index > 0) clone.style.mixBlendMode = BLEND_MODES[index % BLEND_MODES.length];
        if (img.style.transform) clone.style.transform = img.style.transform;
        
        clone.style.left = copyLeft + 'px';
        copyLeft += imgWidth * (1 - OVERLAP_RATIO);
        wrapper.insertBefore(clone, firstOriginalImage);
    });
    
    let copy2Left = oneSetWidth;
    imageElements.forEach((img, index) => {
        const clone = img.cloneNode(true);
        const imgWidth = getImgWidth(img);
        
        if (index > 0) clone.style.mixBlendMode = BLEND_MODES[index % BLEND_MODES.length];
        if (img.style.transform) clone.style.transform = img.style.transform;
        
        clone.style.left = copy2Left + 'px';
        copy2Left += imgWidth * (1 - OVERLAP_RATIO);
        wrapper.appendChild(clone);
    });
    
    wrapper.style.width = (oneSetWidth * 3) + 'px';
    
    function setInitialScroll() {
        if (oneSetWidth > 0) {
            container.scrollLeft = oneSetWidth;
            setupScrollHandlers(container);
        } else {
            requestAnimationFrame(setInitialScroll);
        }
    }
    
    requestAnimationFrame(setInitialScroll);
}

function setupScrollHandlers(container) {
    let isScrolling = false;
    
    let velocity = 0, isAnimating = false, animationId = null;
    const friction = 0.95, minVelocity = 0.1, maxVelocity = 50;
    let autoScrollActive = true, autoScrollSpeed = 3.0, autoScrollAnimationId = null, isUserInteracting = false;
    const maxBlur = 4;
    let currentBlur = 0;
    
    let scrollTimeout = null;
    const handleScroll = () => {
        if (isScrolling || oneSetWidth === 0) return;
        isScrolling = true;
        if (scrollTimeout) cancelAnimationFrame(scrollTimeout);
        scrollTimeout = requestAnimationFrame(() => {
            const scrollLeft = container.scrollLeft;
            if (scrollLeft >= oneSetWidth * 2) {
                container.scrollLeft = scrollLeft - oneSetWidth;
            } else if (scrollLeft < 0) {
                container.scrollLeft = scrollLeft + oneSetWidth;
            }
            isScrolling = false;
            scrollTimeout = null;
        });
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    function updateMotionBlur() {
        const targetBlur = Math.min(maxBlur, (Math.abs(velocity) / maxVelocity) * maxBlur * 0.6);
        currentBlur += (targetBlur - currentBlur) * 0.2;
        scrollWrapper.style.filter = currentBlur > 0.1 ? `blur(${currentBlur}px)` : 'blur(0px)';
        if (currentBlur <= 0.1) currentBlur = 0;
    }
    
    function animateScroll() {
        if (Math.abs(velocity) < minVelocity) {
            velocity = 0;
            isAnimating = false;
            animationId = null;
            updateMotionBlur();
            return;
        }
        
        container.scrollLeft += velocity;
        velocity *= friction;
        updateMotionBlur();
        animationId = requestAnimationFrame(animateScroll);
    }
    
    function startAnimation() {
        if (!isAnimating && Math.abs(velocity) >= minVelocity) {
            isAnimating = true;
            animationId = requestAnimationFrame(animateScroll);
        }
    }
    
    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY * 2;
        velocity = Math.max(-maxVelocity, Math.min(maxVelocity, velocity + delta * 0.3));
        container.scrollLeft += delta;
        updateMotionBlur();
        startAnimation();
        pauseAutoScroll();
        resumeAutoScroll();
    };
    
    container.addEventListener('wheel', handleWheel, { passive: false });
    
    let touchStartX = 0, touchStartY = 0, touchLastX = 0, touchLastTime = 0, touchVelocity = 0;
    
    const handleTouchStart = (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchLastX = touchStartX;
        touchLastTime = Date.now();
        touchVelocity = 0;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
            isAnimating = false;
        }
        velocity = 0;
        updateMotionBlur();
        pauseAutoScroll();
    };
    
    const handleTouchMove = (e) => {
        if (!touchStartX || !touchStartY) return;
        const touchEndX = e.touches[0].clientX;
        const touchEndY = e.touches[0].clientY;
        const currentTime = Date.now();
        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;
        
        if (Math.abs(diffX) > Math.abs(diffY)) {
            e.preventDefault();
            container.scrollLeft += diffX;
            const timeDelta = currentTime - touchLastTime;
            if (timeDelta > 0) {
                touchVelocity = (touchLastX - touchEndX) / timeDelta * 16;
                velocity = touchVelocity;
                updateMotionBlur();
            }
            touchLastX = touchEndX;
            touchLastTime = currentTime;
        }
        touchStartX = touchEndX;
        touchStartY = touchEndY;
    };
    
    const handleTouchEnd = () => {
        if (Math.abs(touchVelocity) > minVelocity) {
            velocity = touchVelocity * 0.5;
            updateMotionBlur();
            startAnimation();
        } else {
            touchVelocity = velocity = 0;
            updateMotionBlur();
        }
        resumeAutoScroll();
    };
    
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    function pauseAutoScroll() {
        isUserInteracting = true;
        if (autoScrollAnimationId) {
            cancelAnimationFrame(autoScrollAnimationId);
            autoScrollAnimationId = null;
        }
    }
    
    function resumeAutoScroll() {
        isUserInteracting = false;
        if (autoScrollActive && !autoScrollAnimationId) startAutoScroll();
    }
    
    function startAutoScroll() {
        if (autoScrollAnimationId || isUserInteracting || !autoScrollActive) {
            if (oneSetWidth === 0) {
                setTimeout(() => startAutoScroll(), 100);
            }
            return;
        }
        
        if (oneSetWidth === 0) {
            setTimeout(() => startAutoScroll(), 100);
            return;
        }
        
        function autoScroll() {
            if (!autoScrollActive || isUserInteracting || oneSetWidth === 0) {
                autoScrollAnimationId = null;
                return;
            }
            container.scrollLeft += autoScrollSpeed;
            autoScrollAnimationId = requestAnimationFrame(autoScroll);
        }
        autoScrollAnimationId = requestAnimationFrame(autoScroll);
    }
    
    function tryStartAutoScroll() {
        if (oneSetWidth > 0) {
            startAutoScroll();
        } else {
            setTimeout(tryStartAutoScroll, 50);
        }
    }
    tryStartAutoScroll();
}

function initCursorBlend() {
    const cursorBlend = document.getElementById('cursorBlend');
    if (!cursorBlend) return;
    
    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;
    let isActive = false;
    let animationFrameId = null;
    
    function animateCursor() {
        cursorX += (mouseX - cursorX) * 0.25;
        cursorY += (mouseY - cursorY) * 0.25;
        cursorBlend.style.left = cursorX + 'px';
        cursorBlend.style.top = cursorY + 'px';
        animationFrameId = requestAnimationFrame(animateCursor);
    }
    
    function stopAnimation() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }
    
    const handleMouseMove = (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        if (!isActive) {
            isActive = true;
            cursorBlend.classList.add('active');
            animateCursor();
        }
    };
    
    const handleMouseLeave = () => {
        isActive = false;
        cursorBlend.classList.remove('active');
        stopAnimation();
    };
    
    const handleMouseEnter = () => {
        if (mouseX > 0 && mouseY > 0) {
            isActive = true;
            cursorBlend.classList.add('active');
            if (!animationFrameId) {
                animateCursor();
            }
        }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    
    const scrollContainer = document.querySelector('.scroll-container');
    if (scrollContainer) {
        scrollContainer.addEventListener('mouseenter', () => {
            cursorBlend.style.width = cursorBlend.style.height = '4704px';
        });
        scrollContainer.addEventListener('mouseleave', () => {
            cursorBlend.style.width = cursorBlend.style.height = '3360px';
        });
    }
}

function initAutoBlend() {
    const container = document.getElementById('autoBlendContainer');
    if (!container) return;
    
    const scrollContainer = document.querySelector('.scroll-container');
    if (!scrollContainer) return;
    
    const numCircles = 3;
    const circles = [];
    
    for (let i = 0; i < numCircles; i++) {
        const circle = document.createElement('div');
        circle.className = 'auto-blend-circle';
        
        const size = 3500 + Math.random() * 1400;
        circle.style.width = size + 'px';
        circle.style.height = size + 'px';
        
        const startX = Math.random() * window.innerWidth;
        const startY = Math.random() * window.innerHeight;
        circle.style.left = startX + 'px';
        circle.style.top = startY + 'px';
        
        container.appendChild(circle);
        
        circles.push({
            element: circle,
            x: startX,
            y: startY,
            speedX: (Math.random() - 0.5) * 0.8,
            speedY: (Math.random() - 0.5) * 0.8,
            size: size
        });
    }
    
    function animateCircles() {
        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight;
        
        circles.forEach((circle) => {
            circle.x += circle.speedX;
            circle.y += circle.speedY;
            
            if (circle.x < -circle.size / 2 || circle.x > containerWidth + circle.size / 2) {
                circle.speedX *= -1;
            }
            if (circle.y < -circle.size / 2 || circle.y > containerHeight + circle.size / 2) {
                circle.speedY *= -1;
            }
            
            circle.x = Math.max(-circle.size / 2, Math.min(containerWidth + circle.size / 2, circle.x));
            circle.y = Math.max(-circle.size / 2, Math.min(containerHeight + circle.size / 2, circle.y));
            
            circle.element.style.left = circle.x + 'px';
            circle.element.style.top = circle.y + 'px';
            
            if (Math.random() < 0.01) {
                circle.speedX = (Math.random() - 0.5) * 0.8;
                circle.speedY = (Math.random() - 0.5) * 0.8;
            }
        });
        
        requestAnimationFrame(animateCircles);
    }
    
    animateCircles();
    
    let lastScrollLeft = 0;
    scrollContainer.addEventListener('scroll', () => {
        const scrollDelta = scrollContainer.scrollLeft - lastScrollLeft;
        lastScrollLeft = scrollContainer.scrollLeft;
        circles.forEach(circle => {
            circle.x -= scrollDelta * 0.1;
        });
    }, { passive: true });
}

function initWebGLShader() {
    const canvas = document.getElementById('webgl-canvas');
    if (!canvas) return null;
    
    if (typeof THREE === 'undefined') {
        canvas.style.display = 'none';
        return null;
    }
    
    try {
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            alpha: true,
            antialias: false,
            powerPreference: "high-performance"
        });
        
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        
        const fragmentShader = `
            uniform vec2 uMouse;
            uniform float uTime;
            uniform float uAspectRatio;
            uniform float uIntensity;
            uniform float uRadius;
            varying vec2 vUv;
            
            void main() {
                vec2 st = vUv;
                st.x *= uAspectRatio;
                vec2 mouse = uMouse;
                mouse.x *= uAspectRatio;
                
                float dist = distance(st, mouse);
                float radius = uRadius;
                float softness = radius * 0.5;
                
                float spot = 1.0 - smoothstep(radius - softness, radius + softness, dist);
                spot = pow(spot, 1.2) * uIntensity;
                
                float centerBoost = 1.0 - smoothstep(0.0, radius * 0.3, dist);
                spot += centerBoost * 0.3;
                
                float brightCore = 1.0 - smoothstep(0.0, radius * 0.2, dist);
                brightCore = pow(brightCore, 0.5) * 2.5;
                
                float brightGlow = 1.0 - smoothstep(radius * 0.2, radius * 0.5, dist);
                brightGlow = pow(brightGlow, 1.2) * 1.8;
                
                float finalBrightness = spot + brightCore + brightGlow;
                finalBrightness = min(finalBrightness, 1.0);
                
                vec3 color = vec3(finalBrightness);
                gl_FragColor = vec4(color, finalBrightness);
            }
        `;
        
        const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uMouse: { value: new THREE.Vector2(0.5, 0.5) },
                uTime: { value: 0 },
                uAspectRatio: { value: window.innerWidth / window.innerHeight },
                uIntensity: { value: 1.0 },
                uRadius: { value: 0.6 }
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            blending: THREE.NormalBlending,
            depthWrite: false
        });
        
        const geometry = new THREE.PlaneGeometry(2, 2);
        const plane = new THREE.Mesh(geometry, material);
        scene.add(plane);
        
        let mouseX = 0.5;
        let mouseY = 0.5;
        let targetMouseX = 0.5;
        let targetMouseY = 0.5;
        
        const handleMouseMove = (e) => {
            targetMouseX = e.clientX / window.innerWidth;
            targetMouseY = 1.0 - (e.clientY / window.innerHeight);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        
        let time = 0;
        function animate() {
            requestAnimationFrame(animate);
            time += 0.01;
            
            mouseX += (targetMouseX - mouseX) * 0.12;
            mouseY += (targetMouseY - mouseY) * 0.12;
            material.uniforms.uIntensity.value = 1.0;
            
            material.uniforms.uMouse.value.set(mouseX, mouseY);
            material.uniforms.uTime.value = time;
            material.uniforms.uAspectRatio.value = window.innerWidth / window.innerHeight;
            renderer.render(scene, camera);
        }
        
        const handleResize = () => {
            renderer.setSize(window.innerWidth, window.innerHeight);
            material.uniforms.uAspectRatio.value = window.innerWidth / window.innerHeight;
        };
        
        window.addEventListener('resize', handleResize);
        
        animate();
        canvas.style.display = 'block';
        return { renderer, material };
        
    } catch (error) {
        canvas.style.display = 'none';
        return null;
    }
}

function initAll() {
    initializeImages().then(() => {
        initWebGLAfterImages();
    }).catch(() => {});
    initCursorBlend();
    initAutoBlend();
}

function initWebGLAfterImages() {
    const cursorBlend = document.getElementById('cursorBlend');
    const canvas = document.getElementById('webgl-canvas');
    
    setTimeout(() => {
        if (typeof THREE !== 'undefined') {
            const webgl = initWebGLShader();
            if (webgl && canvas) {
                if (cursorBlend) cursorBlend.style.display = 'none';
            } else {
                if (cursorBlend) cursorBlend.style.display = 'block';
            }
        } else {
            if (cursorBlend) cursorBlend.style.display = 'block';
        }
    }, 1000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
} else {
    initAll();
}

