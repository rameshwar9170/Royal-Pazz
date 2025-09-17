<?php
class Invoice {
    private $conn;
    private $table_name = "invoices";

    public $id;
    public $order_id;
    public $invoice_number;
    public $customer_name;
    public $customer_email;
    public $customer_phone;
    public $billing_address;
    public $items;
    public $subtotal;
    public $tax_amount;
    public $total_amount;
    public $created_at;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function create() {
        // Generate invoice number
        $this->invoice_number = $this->generateInvoiceNumber();

        $query = "INSERT INTO " . $this->table_name . " 
                SET order_id=:order_id, invoice_number=:invoice_number, 
                    customer_name=:customer_name, customer_email=:customer_email,
                    customer_phone=:customer_phone, billing_address=:billing_address,
                    items=:items, subtotal=:subtotal, tax_amount=:tax_amount,
                    total_amount=:total_amount, created_at=NOW()";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(":order_id", $this->order_id);
        $stmt->bindParam(":invoice_number", $this->invoice_number);
        $stmt->bindParam(":customer_name", $this->customer_name);
        $stmt->bindParam(":customer_email", $this->customer_email);
        $stmt->bindParam(":customer_phone", $this->customer_phone);
        $stmt->bindParam(":billing_address", $this->billing_address);
        $stmt->bindParam(":items", $this->items);
        $stmt->bindParam(":subtotal", $this->subtotal);
        $stmt->bindParam(":tax_amount", $this->tax_amount);
        $stmt->bindParam(":total_amount", $this->total_amount);

        if($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        return false;
    }

    public function getByOrderId() {
        $query = "SELECT * FROM " . $this->table_name . " WHERE order_id = :order_id LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":order_id", $this->order_id);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if($row) {
            $this->id = $row['id'];
            $this->invoice_number = $row['invoice_number'];
            $this->customer_name = $row['customer_name'];
            $this->customer_email = $row['customer_email'];
            $this->customer_phone = $row['customer_phone'];
            $this->billing_address = $row['billing_address'];
            $this->items = $row['items'];
            $this->subtotal = $row['subtotal'];
            $this->tax_amount = $row['tax_amount'];
            $this->total_amount = $row['total_amount'];
            $this->created_at = $row['created_at'];
            return true;
        }
        return false;
    }

    private function generateInvoiceNumber() {
        $prefix = "INV";
        $date = date('Ymd');
        
        // Get last invoice number for today
        $query = "SELECT invoice_number FROM " . $this->table_name . " 
                WHERE invoice_number LIKE :pattern 
                ORDER BY id DESC LIMIT 1";
        
        $stmt = $this->conn->prepare($query);
        $pattern = $prefix . $date . "%";
        $stmt->bindParam(":pattern", $pattern);
        $stmt->execute();
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if($row) {
            $lastNumber = substr($row['invoice_number'], -4);
            $newNumber = str_pad((int)$lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }
        
        return $prefix . $date . $newNumber;
    }

    public function generatePDF() {
        require_once __DIR__ . '/../vendor/autoload.php';
        
        $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);
        
        // Set document information
        $pdf->SetCreator('Royal Pazz');
        $pdf->SetAuthor('Royal Pazz');
        $pdf->SetTitle('Invoice ' . $this->invoice_number);
        
        // Remove default header/footer
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        
        // Add a page
        $pdf->AddPage();
        
        // Set font
        $pdf->SetFont('helvetica', '', 12);
        
        // Company header
        $html = '<h1 style="color: #333; text-align: center;">Royal Pazz</h1>';
        $html .= '<hr style="border: 1px solid #ddd;">';
        
        // Invoice details
        $html .= '<table style="width: 100%; margin-top: 20px;">';
        $html .= '<tr>';
        $html .= '<td style="width: 50%;"><strong>Invoice Number:</strong> ' . $this->invoice_number . '</td>';
        $html .= '<td style="width: 50%; text-align: right;"><strong>Date:</strong> ' . date('d/m/Y', strtotime($this->created_at)) . '</td>';
        $html .= '</tr>';
        $html .= '</table>';
        
        // Customer details
        $html .= '<h3 style="color: #333; margin-top: 30px;">Bill To:</h3>';
        $html .= '<p><strong>' . $this->customer_name . '</strong><br>';
        $html .= 'Email: ' . $this->customer_email . '<br>';
        $html .= 'Phone: ' . $this->customer_phone . '<br>';
        $html .= $this->billing_address . '</p>';
        
        // Items table
        $html .= '<h3 style="color: #333; margin-top: 30px;">Items:</h3>';
        $html .= '<table border="1" cellpadding="5" style="width: 100%; border-collapse: collapse;">';
        $html .= '<tr style="background-color: #f5f5f5;">';
        $html .= '<th>Item</th><th>Quantity</th><th>Price</th><th>Total</th>';
        $html .= '</tr>';
        
        $items = json_decode($this->items, true);
        foreach($items as $item) {
            $html .= '<tr>';
            $html .= '<td>' . $item['name'] . '</td>';
            $html .= '<td>' . $item['quantity'] . '</td>';
            $html .= '<td>₹' . number_format($item['price'], 2) . '</td>';
            $html .= '<td>₹' . number_format($item['total'], 2) . '</td>';
            $html .= '</tr>';
        }
        
        $html .= '</table>';
        
        // Totals
        $html .= '<table style="width: 100%; margin-top: 20px;">';
        $html .= '<tr><td style="width: 70%;"></td><td style="width: 30%;">';
        $html .= '<strong>Subtotal: ₹' . number_format($this->subtotal, 2) . '</strong><br>';
        $html .= '<strong>Tax: ₹' . number_format($this->tax_amount, 2) . '</strong><br>';
        $html .= '<strong style="font-size: 16px;">Total: ₹' . number_format($this->total_amount, 2) . '</strong>';
        $html .= '</td></tr>';
        $html .= '</table>';
        
        $pdf->writeHTML($html, true, false, true, false, '');
        
        // Save PDF
        $filename = 'invoice_' . $this->invoice_number . '.pdf';
        $filepath = __DIR__ . '/../invoices/' . $filename;
        
        // Create invoices directory if it doesn't exist
        if (!file_exists(__DIR__ . '/../invoices/')) {
            mkdir(__DIR__ . '/../invoices/', 0777, true);
        }
        
        $pdf->Output($filepath, 'F');
        
        return $filename;
    }
}
?>
