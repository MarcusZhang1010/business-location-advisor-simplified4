function BusinessLocationAdvisor() {
            const [crimeRate, setCrimeRate] = React.useState(null);
            const [hasImage, setHasImage] = React.useState(false);
            const canvasRef = React.useRef(null);
            const contextRef = React.useRef(null);
            const imageRef = React.useRef(null);
            
            const [isPredicting, setIsPredicting] = React.useState(false);
            const [predictionError, setPredictionError] = React.useState(null);
            const [isSegmenting, setIsSegmenting] = React.useState(false);
            const [originalImage, setOriginalImage] = React.useState(null);

            const preImageUrl = "/images/test.jpg";
            const preSegmentedImageUrl = "/images/seg.png";

            const initializeCanvas = (width, height) => {
                const canvas = canvasRef.current;
                if (!canvas) return;

                canvas.width = width;
                canvas.height = height;

                const context = canvas.getContext('2d');
                contextRef.current = context;

                context.fillStyle = 'white';
                context.fillRect(0, 0, canvas.width, canvas.height);
            };

            React.useEffect(() => {
                initializeCanvas(1000, 600);
                document.getElementById('loading').style.display = 'none';
            }, []);

            const handleSegmentation = () => {
                setIsSegmenting(true);
                
                setTimeout(() => {
                    try {
                        const segmentedImg = new Image();
                        segmentedImg.src = preSegmentedImageUrl;
                        
                        segmentedImg.onload = () => {
                            initializeCanvas(segmentedImg.width, segmentedImg.height);
                            
                            const canvas = canvasRef.current;
                            const context = canvas.getContext('2d');
                    
                            context.drawImage(segmentedImg, 0, 0);
                            
                            imageRef.current = {
                                element: segmentedImg,
                                width: segmentedImg.width,
                                height: segmentedImg.height
                            };
                            setHasImage(true);
                            
                            setIsSegmenting(false);
                        };
                        
                        segmentedImg.onerror = () => {
                            setIsSegmenting(false);
                        };
                    } catch (error) {
                        setIsSegmenting(false);
                    }
                }, 3000);
            };

            const calculatePixelRatios = () => {
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const pixels = imageData.data;
    
                const rgbCounts = new Map();
                const totalPixels = pixels.length / 4;
    
                for (let i = 0; i < pixels.length; i += 4) {
                    const r = pixels[i];
                    const g = pixels[i + 1];
                    const b = pixels[i + 2];
                    const key = `${r},${g},${b}`;
        
                    rgbCounts.set(key, (rgbCounts.get(key) || 0) + 1);
                }
    
                const features = Array.from(rgbCounts.entries()).map(([key, count]) => {
                    const [r, g, b] = key.split(',').map(Number);
                    return {
                        r: r,
                        g: g,
                        b: b,
                        ratio: count / totalPixels
                    };
                });
    
                features.sort((a, b) => b.ratio - a.ratio);
    
                return features;
            };
            
            const handlePredict = async () => {
                
                if (!hasImage) return;
                
                try {
                    setIsPredicting(true);
                    setPredictionError(null);
                    
                    const canvas = canvasRef.current;
                    const rgbRatios = calculatePixelRatios();
                    
                    const response = await fetch('/predict', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            features: rgbRatios
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    setCrimeRate(data.crime_rate);

                } catch (error) {
                    setPredictionError(error.message);
                    setCrimeRate(null);
                } finally {
                    setIsPredicting(false);
                }
            };
            
            const renderPredictionResult = () => {
                if (isPredicting) {
                    return (
                        <div className="text-center py-12">
                            <div className="inline-block w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                            <p className="mt-4 text-gray-500">预测中...</p>
                        </div>
                    );
                }

                if (predictionError) {
                    return (
                        <div className="py-8 text-center">
                            <p className="text-gray-400">{predictionError}</p>
                        </div>
                    );
                }

                if (crimeRate !== null) {
                    return (
                        <div className="space-y-6">
                            <div className="text-center">
                                <p className="text-sm text-gray-500 uppercase tracking-widest">犯罪率预测</p>
                                <p className="text-6xl font-light mt-4 text-gray-900">{crimeRate.toFixed(2)}%</p>
                            </div>
                            
                            <div className="h-px bg-gray-200"></div>
                            
                            <div className="text-center">
                                <p className="text-gray-500">
                                    {crimeRate < 15 ? '该区域犯罪率较低，安全系数较高，适合商业选址' : 
                                     crimeRate < 25 ? '该区域犯罪率中等，建议结合其他因素综合考虑' : 
                                     '该区域犯罪率较高，不建议商业选址'}
                                </p>
                            </div>
                        </div>
                    );
                }

                return null;
            };
            
            return (
                <div className="min-h-screen bg-white">
                    <header className="pt-20 pb-12 text-center border-b border-gray-200">
                        <h1 className="text-4xl font-semibold text-gray-900 tracking-tight">商业选址参考</h1>
                        <p className="mt-3 text-lg text-gray-500">基于街景图像的犯罪率分析</p>
                    </header>

                    <main className="max-w-2xl mx-auto px-6 py-16">
                        <section className="space-y-6">
                            <div className="border border-gray-200 rounded-lg p-8">
                                <h2 className="text-lg font-medium text-gray-900 mb-6">上传街景图像</h2>
                                <div className="border-2 border-dashed border-gray-200 rounded-lg p-12 text-center">
                                    <div className="text-gray-500">
                                        <p className="text-lg font-medium">暂不支持</p>
                                        <p className="mt-2 text-sm text-gray-400">此功能正在开发中</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={handleSegmentation}
                                    disabled={isSegmenting}
                                    className="flex-1 py-4 px-6 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 active:bg-gray-950 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                                >
                                    {isSegmenting ? '分割中...' : '图像分割'}
                                </button>
                                <button
                                    onClick={handlePredict}
                                    disabled={!hasImage || isPredicting}
                                    className="flex-1 py-4 px-6 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 active:bg-gray-950 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                                >
                                    {isPredicting ? '预测中...' : '预测犯罪率'}
                                </button>
                            </div>
                        </section>

                        <section className="mt-16 space-y-8">
                            <div>
                                <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-4">原始图像</h3>
                                <div className="aspect-video bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                                    <img
                                        src={preImageUrl}
                                        alt="Test Image"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-4">分割结果</h3>
                                <div className="aspect-video bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                                    <canvas
                                        ref={canvasRef}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="mt-16 py-12 border-t border-gray-200">
                            {renderPredictionResult()}
                        </section>
                    </main>

                    <footer className="border-t border-gray-200 py-8">
                        <p className="text-center text-sm text-gray-400">
                            © 2026 商业选址参考系统
                        </p>
                    </footer>
                </div>
            );
        }
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<BusinessLocationAdvisor />);