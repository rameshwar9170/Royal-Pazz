<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../config/database.php';
include_once '../models/Invoice.php';

$database = new Database();
$db = $database->getConnection();

$invoice = new Invoice($db);

if(isset($_GET['invoice_id'])) {
    $invoice->id = $_GET['invoice_id'];
    
    if($invoice->getById()) {
        $filename = 'invoice_' . $invoice->invoice_number . '.pdf';
        $filepath = __DIR__ . '/../invoices/' . $filename;
        
        if(file_exists($filepath)) {
            header('Content-Type: application/pdf');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Content-Length: ' . filesize($filepath));
            readfile($filepath);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Invoice file not found."]);
        }
    } else {
        http_response_code(404);
        echo json_encode(["message" => "Invoice not found."]);
    }
} else {
    http_response_code(400);
    echo json_encode(["message" => "Invoice ID is required."]);
}
?>
