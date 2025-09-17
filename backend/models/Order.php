<?php
class Order {
    private $conn;
    private $table_name = "orders";

    public $id;
    public $user_id;
    public $total_amount;
    public $status;
    public $payment_id;
    public $razorpay_order_id;
    public $razorpay_payment_id;
    public $razorpay_signature;
    public $items;
    public $shipping_address;
    public $created_at;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function create() {
        $query = "INSERT INTO " . $this->table_name . " 
                SET user_id=:user_id, total_amount=:total_amount, status=:status, 
                    razorpay_order_id=:razorpay_order_id, items=:items, 
                    shipping_address=:shipping_address, created_at=NOW()";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->bindParam(":total_amount", $this->total_amount);
        $stmt->bindParam(":status", $this->status);
        $stmt->bindParam(":razorpay_order_id", $this->razorpay_order_id);
        $stmt->bindParam(":items", $this->items);
        $stmt->bindParam(":shipping_address", $this->shipping_address);

        if($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        return false;
    }

    public function updatePaymentStatus() {
        $query = "UPDATE " . $this->table_name . " 
                SET status=:status, razorpay_payment_id=:razorpay_payment_id, 
                    razorpay_signature=:razorpay_signature 
                WHERE id=:id";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(":status", $this->status);
        $stmt->bindParam(":razorpay_payment_id", $this->razorpay_payment_id);
        $stmt->bindParam(":razorpay_signature", $this->razorpay_signature);
        $stmt->bindParam(":id", $this->id);

        return $stmt->execute();
    }

    public function getById() {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = :id LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $this->id);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if($row) {
            $this->user_id = $row['user_id'];
            $this->total_amount = $row['total_amount'];
            $this->status = $row['status'];
            $this->razorpay_order_id = $row['razorpay_order_id'];
            $this->razorpay_payment_id = $row['razorpay_payment_id'];
            $this->razorpay_signature = $row['razorpay_signature'];
            $this->items = $row['items'];
            $this->shipping_address = $row['shipping_address'];
            $this->created_at = $row['created_at'];
            return true;
        }
        return false;
    }

    public function getByRazorpayOrderId() {
        $query = "SELECT * FROM " . $this->table_name . " WHERE razorpay_order_id = :razorpay_order_id LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":razorpay_order_id", $this->razorpay_order_id);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if($row) {
            $this->id = $row['id'];
            $this->user_id = $row['user_id'];
            $this->total_amount = $row['total_amount'];
            $this->status = $row['status'];
            $this->razorpay_payment_id = $row['razorpay_payment_id'];
            $this->razorpay_signature = $row['razorpay_signature'];
            $this->items = $row['items'];
            $this->shipping_address = $row['shipping_address'];
            $this->created_at = $row['created_at'];
            return true;
        }
        return false;
    }
}
?>
