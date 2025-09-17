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
    
    if(!empty($data->items) && !empty($data->total_amount)) {
        $razorpay = new RazorpayConfig();
        
        // Create Razorpay order
        $razorpayOrder = $razorpay->getApi()->order->create([
            'receipt' => 'order_' . time() . '_' . rand(1000, 9999),
            'amount' => $data->total_amount * 100, // Amount in paise
            'currency' => 'INR',
            'payment_capture' => 1
        ]);

        http_response_code(201);
        echo json_encode([
            "success" => true,
            "message" => "Order created successfully.",
            "order_id" => $razorpayOrder['id'],
            "razorpay_order_id" => $razorpayOrder['id'],
            "amount" => $data->total_amount,
            "currency" => "INR",
            "key_id" => $razorpay->getKeyId(),
            "items" => $data->items,
            "user_id" => isset($data->user_id) ? $data->user_id : null
        ]);
    } else {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Unable to create order. Data is incomplete."
        ]);
    }
} catch(Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error creating Razorpay order.",
        "error" => $e->getMessage()
    ]);
}

// Original database code (uncomment when database is ready)
/*
include_once '../config/database.php';
include_once '../config/razorpay.php';
include_once '../models/Order.php';

$database = new Database();
$db = $database->getConnection();

$order = new Order($db);
$razorpay = new RazorpayConfig();

// Get posted data
$data = json_decode(file_get_contents("php://input"));

if(!empty($data->items) && !empty($data->total_amount)) {
    try {
        // Create Razorpay order
        $razorpayOrder = $razorpay->getApi()->order->create([
            'receipt' => 'order_' . time(),
            'amount' => $data->total_amount * 100, // Amount in paise
            'currency' => 'INR',
            'payment_capture' => 1
        ]);

        // Set order properties
        $order->user_id = isset($data->user_id) ? $data->user_id : null;
        $order->total_amount = $data->total_amount;
        $order->status = 'pending';
        $order->razorpay_order_id = $razorpayOrder['id'];
        $order->items = json_encode($data->items);
        $order->shipping_address = json_encode($data->shipping_address);

        // Create order in database
        if($order->create()) {
            http_response_code(201);
            echo json_encode([
                "message" => "Order created successfully.",
                "order_id" => $order->id,
                "razorpay_order_id" => $razorpayOrder['id'],
                "amount" => $data->total_amount,
                "currency" => "INR",
                "key_id" => $razorpay->getKeyId()
            ]);
        } else {
            http_response_code(503);
            echo json_encode(["message" => "Unable to create order."]);
        }
    } catch(Exception $e) {
        http_response_code(500);
        echo json_encode([
            "message" => "Error creating Razorpay order.",
            "error" => $e->getMessage()
        ]);
    }
} else {
    http_response_code(400);
    echo json_encode(["message" => "Unable to create order. Data is incomplete."]);
}
*/
?>
