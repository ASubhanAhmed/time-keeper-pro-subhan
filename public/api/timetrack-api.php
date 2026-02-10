<?php
// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$host     = 'sdb-52.hosting.stackcp.net';
$port     = 3306;
$dbname   = 'indusai_sindh_db-353030343dd2';
$username = 'indusai_sindh_db-353030343dd2';
$password = '*bff#15a3$7';

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    echo json_encode(["error" => "DB connection failed: " . $e->getMessage()]);
    exit;
}

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'list') {
    $stmt = $pdo->query("SELECT * FROM `timetrack_expert` ORDER BY `Date` DESC");
    $rows = $stmt->fetchAll();
    echo json_encode(["data" => $rows]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents("php://input"), true);

    if ($action === 'upsert') {
        $stmt = $pdo->prepare("INSERT INTO `timetrack_expert` (`Date`, `Type`, `Start`, `End`, `Break (min)`, `Office Time`, `Sessions`, `Notes`)
            VALUES (:date, :type, :start, :end, :break_min, :office_time, :sessions, :notes)
            ON DUPLICATE KEY UPDATE
                `Type` = VALUES(`Type`),
                `Start` = VALUES(`Start`),
                `End` = VALUES(`End`),
                `Break (min)` = VALUES(`Break (min)`),
                `Office Time` = VALUES(`Office Time`),
                `Sessions` = VALUES(`Sessions`),
                `Notes` = VALUES(`Notes`)");
        $stmt->execute([
            ':date' => $body['date'],
            ':type' => $body['type'],
            ':start' => $body['start'] ?? null,
            ':end' => $body['end'] ?? null,
            ':break_min' => $body['break_min'] ?? null,
            ':office_time' => $body['office_time'] ?? null,
            ':sessions' => $body['sessions'] ?? 0,
            ':notes' => $body['notes'] ?? null,
        ]);
        echo json_encode(["success" => true]);
        exit;
    }

    if ($action === 'delete') {
        $stmt = $pdo->prepare("DELETE FROM `timetrack_expert` WHERE `Date` = :date");
        $stmt->execute([':date' => $body['date']]);
        echo json_encode(["success" => true]);
        exit;
    }
}

echo json_encode(["error" => "Unknown action"]);
