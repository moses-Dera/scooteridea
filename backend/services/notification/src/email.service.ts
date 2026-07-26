import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { logger } from '@ebike/core';

export class EmailService {
  private static getGmailClient() {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  private static async sendEmail(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<void> {
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_REFRESH_TOKEN) {
      logger.warn({ to, subject }, '[Notification] Gmail API not configured — skipping email');
      return;
    }
    try {
      const from = `"Scooterfy" <${process.env.SMTP_USER || 'scooterfy.test@gmail.com'}>`;
      
      const emailLines = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=utf-8`,
        ``,
        html
      ];
      
      const rawEmail = emailLines.join('\r\n');
      const encodedMessage = Buffer.from(rawEmail).toString('base64url');

      const gmail = EmailService.getGmailClient();
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      logger.info({ to, subject }, '[Notification] Email sent via Gmail API');
    } catch (err: any) {
      logger.error({ err: err.message }, '[Notification] Failed to send email via Gmail API');
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
    const adminUrl = process.env.ADMIN_WEB_URL || 'https://scooterfy-admin.vercel.app';
    const riderUrl = process.env.RIDER_WEB_URL || 'https://scooterfy.vercel.app';
    
    let resetLink = `${adminUrl}/reset-password?token=${resetToken}`;
    if (role === 'RIDER') {
      resetLink = `${riderUrl}/reset-password?token=${resetToken}`;
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
