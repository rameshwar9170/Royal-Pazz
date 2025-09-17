<?php
require_once __DIR__ . '/../vendor/autoload.php';
use Razorpay\Api\Api;

class RazorpayConfig {
    private $keyId;
    private $keySecret;
    private $api;

    public function __construct() {
        // Load environment variables
        $this->loadEnv();
        $this->keyId = $_ENV['RAZORPAY_KEY_ID'];
        $this->keySecret = $_ENV['RAZORPAY_KEY_SECRET'];
        $this->api = new Api($this->keyId, $this->keySecret);
    }

    private function loadEnv() {
        $envFile = __DIR__ . '/../../.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
                    list($key, $value) = explode('=', $line, 2);
                    $_ENV[trim($key)] = trim($value);
                }
            }
        }
    }

    public function getApi() {
        return $this->api;
    }

    public function getKeyId() {
        return $this->keyId;
    }
}
?>
