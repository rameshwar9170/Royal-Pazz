<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

include_once '../config/razorpay.php';

try {
    // Get posted data
    $data = json_decode(file_get_contents("php://input"));
    
    if(!empty($data->razorpay_payment_id) && !empty($data->razorpay_order_id) && !empty($data->razorpay_signature)) {
        $razorpay = new RazorpayConfig();
        
        // Verify payment signature
        $attributes = [
            'razorpay_order_id' => $data->razorpay_order_id,
            'razorpay_payment_id' => $data->razorpay_payment_id,
            'razorpay_signature' => $data->razorpay_signature
        ];

        $razorpay->getApi()->utility->verifyPaymentSignature($attributes);

        // Payment verified successfully
        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Payment verified successfully.",
            "payment_id" => $data->razorpay_payment_id,
            "order_id" => $data->razorpay_order_id,
            "status" => "completed",
            "verified_at" => date('Y-m-d H:i:s')
        ]);
        
    } else {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Payment verification failed. Missing required data."
        ]);
    }
} catch(Exception $e) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Payment verification failed.",
        "error" => $e->getMessage()
    ]);
}
?>
