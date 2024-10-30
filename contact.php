<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Adres e-mail, na który będzie wysyłana wiadomość
$to = "marek@grvbowski.com";
$subject = "New Contact Form Submission";

// Pobranie danych z formularza
$name = $_POST['name'];
$email = $_POST['email'];
$message = $_POST['message'];

// Walidacja danych
if (empty($name) || empty($email) || empty($message)) {
    echo "All fields are required.";
    exit;
}

// Budowanie treści e-maila
$email_content = "Name: $name\n";
$email_content .= "Email: $email\n\n";
$email_content .= "Message:\n$message\n";

// Nagłówki e-maila
$headers = "From: $email";

// Wysłanie e-maila
if (mail($to, $subject, $email_content, $headers)) {
    echo "Thank you! Your message has been sent.";
} else {
    echo "Oops! Something went wrong, please try again.";
}
?>
