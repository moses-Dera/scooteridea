import nodemailer from 'nodemailer';
import { logger } from '@ebike/core';

export class EmailService {
  private static getTransporter() {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  private static async sendEmail(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<void> {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn({ to, subject }, '[Notification] SMTP not configured — skipping email');
      return;
    }
    try {
      await EmailService.getTransporter().sendMail({
        from: `"Scooterfy" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });
      logger.info({ to, subject }, '[Notification] Email sent');
    } catch (err) {
      logger.error({ err }, '[Notification] Failed to send email');
    }
  }

  static async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await EmailService.sendEmail(
      email,
      'Welcome to Scooterfy! 🛴',
      `Hi ${name},\n\nWelcome to Scooterfy! Start exploring the city with your first ride.\n\nThe Scooterfy Team`,
      `<strong>Hi ${name},</strong><br><br>Welcome to Scooterfy! Start exploring the city with your first ride.<br><br>The Scooterfy Team`,
    );
  }

  static async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    role: string,
  ): Promise<void> {
    let resetLink = `https://admin.scooter.com/reset-password?token=${resetToken}`;
    if (role === 'RIDER') {
      resetLink = `scooterapp://reset-password?token=${resetToken}`;
    }

    await EmailService.sendEmail(
      email,
      'Scooterfy Password Reset Request',
      `You requested a password reset. Click this link to reset your password: ${resetLink}. This link expires in 15 minutes.`,
      `<strong>You requested a password reset.</strong><br><br>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 15 minutes.`,
    );
  }

  static async sendRideReceiptEmail(email: string, fareCents: number): Promise<void> {
    const formattedFare = (fareCents / 100).toFixed(2);
    await EmailService.sendEmail(
      email,
      'Your Scooterfy Ride Receipt 🏁',
      `Thanks for riding with us! Your total fare was ₦${formattedFare}.\n\nThe Scooterfy Team`,
      `<strong>Thanks for riding with us!</strong><br><br>Your total fare was <strong>₦${formattedFare}</strong>.<br><br>The Scooterfy Team`,
    );
  }

  static async sendPaymentFailedEmail(email: string): Promise<void> {
    await EmailService.sendEmail(
      email,
      'Scooterfy Payment Failed 💳',
      'We were unable to process payment for your recent ride. Please top up your wallet in the app to continue riding.',
      '<strong>We were unable to process payment for your recent ride.</strong><br><br>Please top up your wallet in the app to continue riding.',
    );
  }

  static async sendTwoFactorOtpEmail(email: string, otp: string): Promise<void> {
    await EmailService.sendEmail(
      email,
      'Your Scooterfy Security Code 🔒',
      `Your security code is: ${otp}. This code expires in 5 minutes. Do not share this code with anyone.`,
      `Your security code is: <strong>${otp}</strong>.<br><br>This code expires in 5 minutes. Do not share this code with anyone.`,
    );
  }
}
