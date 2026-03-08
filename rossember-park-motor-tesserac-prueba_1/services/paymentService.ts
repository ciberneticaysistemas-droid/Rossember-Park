export interface PaymentInitResponse {
    transactionId: string;
    paymentUrl: string;
}

const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

export const initiatePayment = async (
    recordId: string,
    amount: number,
    email: string
): Promise<PaymentInitResponse> => {
    // En producción, esto llamaría a tu backend real o a n8n para generar la firma de Wompi
    // Por ahora simulamos la respuesta para que puedas probar el flujo UI

    console.log(`Iniciando pago para ${recordId} por $${amount} USD, webhook: ${WEBHOOK_URL}`);

    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                transactionId: `trx_${Date.now()}`,
                paymentUrl: "https://checkout.wompi.co/..." // URL simulada
            });
        }, 1000);
    });
};

export const checkPaymentStatus = async (transactionId: string): Promise<boolean> => {
    // Aquí consultarías a tu backend si n8n ya actualizó la base de datos
    return true;
};
