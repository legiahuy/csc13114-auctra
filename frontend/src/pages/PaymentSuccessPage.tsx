import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Download, ArrowRight, FileText, Upload, AlertCircle } from 'lucide-react';
import apiClient from '../api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Order {
    id: number;
    productId: number;
    finalPrice: number;
    status: string;
    paymentMethod?: string;
    paymentTransactionId?: string;
    paymentProof?: string;
    createdAt: string;
    updatedAt: string;
    product: {
        id: number;
        name: string;
        mainImage: string;
        category: {
            name: string;
        };
    };
    seller: {
        id: number;
        fullName: string;
        email: string;
    };
    buyer: {
        id: number;
        fullName: string;
        email: string;
    };
}

export default function PaymentSuccessPage() {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploadingPaymentProof, setUploadingPaymentProof] = useState(false);
    const [paymentProofUrl, setPaymentProofUrl] = useState('');
    const paymentProofInputRef = useRef<HTMLInputElement>(null);
    const receiptRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const response = await apiClient.get(`/orders/${orderId}`);
                const orderData = response.data.data;
                setOrder(orderData);
                setPaymentProofUrl(orderData.paymentProof || '');
            } catch (error) {
                console.error('Error fetching order:', error);
                toast.error('Failed to load order details');
            } finally {
                setLoading(false);
            }
        };

        if (orderId) {
            fetchOrder();
        }
    }, [orderId]);

    const handleDownloadPDF = async () => {
        if (!order) return;

        try {
            toast.loading('Preparing PDF...');

            // Dynamically import libraries
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;
            // No need to import format, it's already imported at top

            // Helper to convert image to base64
            const getBase64Image = async (url: string) => {
                try {
                    const response = await fetch(url, { mode: 'cors' });
                    if (!response.ok) throw new Error('Network response was not ok');
                    const blob = await response.blob();
                    return new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    console.warn('Failed to load image for PDF, skipping', e);
                    return null;
                }
            };

            // Try to load product image
            let productImgBase64 = null;
            if (order.product.mainImage) {
                productImgBase64 = await getBase64Image(order.product.mainImage);
            }

            // Create a temporary iframe to isolate styles and avoid Tailwind's modern color formats (lab/oklch)
            // which are not supported by html2canvas 1.4.1 causing "unsupported color function" errors
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.left = '-9999px';
            iframe.style.top = '0';
            iframe.style.width = '1000px';
            iframe.style.height = '2000px';
            iframe.style.border = 'none';
            document.body.appendChild(iframe);

            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) {
                document.body.removeChild(iframe);
                throw new Error('Failed to create PDF generation context');
            }

            // Initialize iframe with clean styles
            iframeDoc.open();
            iframeDoc.write('<html><head><style>body { margin: 0; padding: 0; background-color: white; font-family: Arial, sans-serif; }</style></head><body></body></html>');
            iframeDoc.close();

            // Create the container inside the iframe
            const receiptDiv = iframeDoc.createElement('div');
            receiptDiv.style.width = '800px';
            receiptDiv.style.padding = '40px';
            receiptDiv.style.backgroundColor = 'white';
            receiptDiv.style.boxSizing = 'border-box';

            receiptDiv.innerHTML = `
                <div style="max-width: 800px; margin: 0 auto;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <span style="color: white; font-size: 40px;">✓</span>
                        </div>
                        <h1 style="font-size: 32px; font-weight: bold; color: #166534; margin: 0 0 10px 0;">Payment Successful!</h1>
                        <p style="color: #15803d; font-size: 16px;">Your payment has been processed successfully</p>
                    </div>

                    <div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 30px; background: white;">
                        <div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px;">
                            <h2 style="font-size: 20px; font-weight: bold; margin: 0 0 20px 0;">Payment Receipt</h2>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <span style="color: #6b7280;">Order ID:</span>
                                <span style="font-weight: 600; font-family: monospace;">#${order.id}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <span style="color: #6b7280;">Date:</span>
                                <span style="font-weight: 500;">${format(new Date(order.updatedAt || order.createdAt), 'PPpp')}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #6b7280;">Status:</span>
                                <span style="color: #16a34a; font-weight: 600;">✓ Payment Successful</span>
                            </div>
                        </div>

                        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-bottom: 20px;">
                            <h3 style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin: 0 0 15px 0;">Product Details</h3>
                            <div style="display: flex; gap: 15px;">
                                ${productImgBase64 ? `
                                    <img 
                                        src="${productImgBase64}" 
                                        alt="Product" 
                                        style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb;"
                                    />
                                ` : ''}
                                <div style="flex: 1;">
                                    <p style="font-weight: 600; margin: 0 0 5px 0;">${order.product.name}</p>
                                    <p style="color: #6b7280; font-size: 14px; margin: 0;">${order.product.category.name}</p>
                                </div>
                            </div>
                        </div>

                        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-bottom: 20px;">
                            <h3 style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin: 0 0 15px 0;">Payment Information</h3>
                            <div style="margin-bottom: 10px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                    <span style="color: #6b7280;">Payment Method:</span>
                                    <span style="font-weight: 500;">${order.paymentMethod || 'Stripe'}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                                    <span style="color: #6b7280;">Transaction ID:</span>
                                    <span style="font-family: monospace; font-size: 12px;">${order.paymentTransactionId || 'Processing...'}</span>
                                </div>
                                <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: 600; font-size: 16px;">Total Amount Paid:</span>
                                    <span style="font-size: 24px; font-weight: bold; color: #16a34a;">${parseFloat(order.finalPrice.toString()).toLocaleString('vi-VN')} VNĐ</span>
                                </div>
                            </div>
                        </div>

                        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div>
                                    <h3 style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin: 0 0 10px 0;">Buyer</h3>
                                    <p style="font-weight: 500; margin: 0 0 5px 0;">${order.buyer.fullName}</p>
                                    <p style="color: #6b7280; font-size: 14px; margin: 0;">${order.buyer.email}</p>
                                </div>
                                <div>
                                    <h3 style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin: 0 0 10px 0;">Seller</h3>
                                    <p style="font-weight: 500; margin: 0 0 5px 0;">${order.seller.fullName}</p>
                                    <p style="color: #6b7280; font-size: 14px; margin: 0;">${order.seller.email}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <p style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px;">Thank you for your purchase!</p>
                </div>
            `;

            iframeDoc.body.appendChild(receiptDiv);

            const canvas = await html2canvas(receiptDiv, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 800,
            });

            document.body.removeChild(iframe);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const imgWidth = 210; // A4 width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`payment-receipt-${order.id}.pdf`);

            toast.dismiss();
            toast.success('PDF downloaded successfully!');
        } catch (error: any) {
            console.error('Error generating PDF:', error);
            toast.dismiss();
            toast.error(error.message || 'Failed to generate PDF');
        }
    };

    const handlePaymentProofUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB');
            return;
        }

        setUploadingPaymentProof(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await apiClient.post('/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const fileUrl = uploadResponse.data.data.url;
            setPaymentProofUrl(fileUrl);

            // Update order with payment proof
            await apiClient.put(`/orders/${orderId}`, {
                paymentProof: fileUrl,
            });

            toast.success('Payment proof uploaded successfully!');

            // Update local order state
            if (order) {
                setOrder({ ...order, paymentProof: fileUrl });
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(error.response?.data?.error?.message || 'Failed to upload payment proof');
        } finally {
            setUploadingPaymentProof(false);
            if (paymentProofInputRef.current) {
                paymentProofInputRef.current.value = '';
            }
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading receipt...</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <p className="text-muted-foreground">Order not found</p>
                    <Button onClick={() => navigate('/')} className="mt-4">
                        Go Home
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 py-12 px-4 rounded-2xl">
            <div className="container mx-auto max-w-3xl space-y-6">
                {/* Success Header */}
                <div className="text-center">
                    <div className="mx-auto h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                        <CheckCircle2 className="h-12 w-12 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-green-900 dark:text-green-100 mb-2">
                        Payment Successful!
                    </h1>
                    <p className="text-green-700 dark:text-green-300">
                        Your payment has been processed successfully
                    </p>
                </div>

                {/* Receipt Card */}
                <Card className="shadow-xl" ref={receiptRef}>
                    <CardHeader className="border-b bg-muted/30">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Payment Receipt
                            </CardTitle>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownloadPDF}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Save as PDF
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {/* Order Info */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Order ID:</span>
                                <span className="font-mono font-semibold">#{order.id}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Date:</span>
                                <span className="font-medium">
                                    {format(new Date(order.updatedAt), 'PPpp')}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Status:</span>
                                <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Payment Successful
                                </span>
                            </div>
                        </div>

                        <Separator />

                        {/* Product Details */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                                Product Details
                            </h3>
                            <div className="flex gap-4">
                                <img
                                    src={order.product.mainImage}
                                    alt={order.product.name}
                                    crossOrigin="anonymous"
                                    className="h-20 w-20 rounded-lg object-cover border"
                                />
                                <div className="flex-1">
                                    <p className="font-semibold">{order.product.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {order.product.category.name}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Payment Details */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                                Payment Information
                            </h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Payment Method:</span>
                                    <span className="font-medium">{order.paymentMethod || 'Stripe'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Transaction ID:</span>
                                    <span className="font-mono text-xs">
                                        {order.paymentTransactionId || 'Processing...'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t">
                                    <span className="font-semibold">Total Amount Paid:</span>
                                    <span className="text-2xl font-bold text-green-600">
                                        {parseFloat(order.finalPrice.toString()).toLocaleString('vi-VN')} VNĐ
                                    </span>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Buyer & Seller Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                                    Buyer
                                </h3>
                                <div className="text-sm">
                                    <p className="font-medium">{order.buyer.fullName}</p>
                                    <p className="text-muted-foreground">{order.buyer.email}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                                    Seller
                                </h3>
                                <div className="text-sm">
                                    <p className="font-medium">{order.seller.fullName}</p>
                                    <p className="text-muted-foreground">{order.seller.email}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Proof Upload Section */}
                <Card className="shadow-xl">
                    <CardHeader className="border-b">
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5" />
                            Upload Payment Proof
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        {
                            !paymentProofUrl && (
                                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
                            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-amber-900 dark:text-amber-100 my-0">
                                    Required: Upload Screenshot of This Receipt
                                </p>
                                <p className="text-xs text-amber-800 dark:text-amber-200 mt-1 my-0">
                                    Please take a screenshot of the payment receipt above and upload it here. This will be shared with the seller as proof of payment.
                                </p>
                            </div>
                        </div>
                            )
                        }
                        {paymentProofUrl ? (
                            <div className="space-y-3">
                                <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 px-4 py-3">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm text-green-900 dark:text-green-100 font-medium my-0">
                                            Payment proof uploaded successfully!
                                        </p>
                                        <a
                                            href={paymentProofUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:underline inline-block"
                                        >
                                            View uploaded proof
                                        </a>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => paymentProofInputRef.current?.click()}
                                    disabled={uploadingPaymentProof}
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Different Proof
                                </Button>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                                <p className="text-sm font-medium mb-1">No payment proof yet</p>
                                <p className="text-xs text-muted-foreground mb-4">
                                    Accepts: JPG, PNG (Max 5MB)
                                </p>
                                <Button
                                    onClick={() => paymentProofInputRef.current?.click()}
                                    disabled={uploadingPaymentProof}
                                    size="sm"
                                >
                                    {uploadingPaymentProof ? (
                                        <>
                                            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Select Image
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}

                        <input
                            ref={paymentProofInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePaymentProofUpload}
                            className="hidden"
                        />
                    </CardContent>
                </Card>

                {/* Next Steps & Action */}
                <Card className="shadow-xl">
                    <CardContent className="p-6 space-y-4">
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4">
                            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                What's Next?
                            </h3>
                            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                                <li className={paymentProofUrl ? 'line-through opacity-50' : ''}>
                                    • Upload your payment proof screenshot
                                </li>
                                <li>• Provide your shipping address</li>
                                <li>• Wait for the seller to ship your item</li>
                                <li>• Confirm delivery when you receive the item</li>
                            </ul>
                        </div>

                        <Button
                            className="w-full"
                            size="lg"
                            onClick={() => navigate(`/orders/${orderId}`)}
                            disabled={!paymentProofUrl}
                        >
                            {paymentProofUrl ? (
                                <>
                                    Continue to Shipping Address
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </>
                            ) : (
                                <>
                                    Upload Payment Proof to Continue
                                </>
                            )}
                        </Button>

                        {!paymentProofUrl && (
                            <p className="text-xs text-center text-muted-foreground">
                                You must upload payment proof before proceeding
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
