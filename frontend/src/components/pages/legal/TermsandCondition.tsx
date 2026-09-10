"use client";

import './TermsandConditions.css';
import Layout from '@/components/layout/Layout';

const TermsandCondition = () => {
  return (
    <Layout content={<TermsAndConditions/>}/>
  )
}

export default TermsandCondition

const TermsAndConditions: React.FC = () => {
  return (
    <div>
      <img loading="lazy"
        src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/overall_images/terms.png"
        style={{ marginBottom: "4%" }}
      ></img>

      <div style={{ paddingInline: "6%", fontFamily: "Arial, sans-serif" }}>
        <h1 className="terms-header">Terms & Conditions</h1>
        <p>
          <strong>Last updated:</strong> 23-01-2025
        </p>

        <p>
          Welcome to Vedic Vaibhav. By using our website and services, you agree
          to comply with and be bound by the following terms and conditions.
          Please read these carefully.
        </p>

        <h2>1. General Information</h2>
        <p>
          Vedic Vaibhav provides online spiritual services, including puja,
          havan, prasad offerings, and related services to support your
          religious beliefs. All services are intended for spiritual purposes
          and are subject to individual faith and practices.
        </p>
        <p>
          <strong>Note:</strong> We are currently operating as a proprietorship
          and are in the process of registering as a private limited company.
          The terms and conditions will be updated once the transition is
          complete.
        </p>

        <h2>2. Service Offerings</h2>
        <p>We offer the following services:</p>
        <ul>
          <li>Online puja services</li>
          <li>Havan and other religious rituals</li>
          <li>Prasad offerings</li>
          <li>Spiritual Ecommerce</li>
          <li>Astrology Services</li>
        </ul>
        <p style={{ marginTop: "1%" }}>
          The details of these services, including their description and
          pricing, are available on our website. You agree to use these services
          at your own discretion, and any engagement with our services is based
          on your own beliefs and practices.
        </p>

        <h2>3. Booking Process</h2>
        <p>
          To book a puja, you must complete the booking form on our website and
          provide accurate information. By submitting the booking form, you
          confirm that all details provided are correct. Payment is required at
          the time of booking to confirm your service.
        </p>

        <h2>4. Payment Terms</h2>
        <p>
          All prices listed are in Indian Rupees (INR) and inclusive of
          applicable taxes.
        </p>
        <ul>
          <li>
            Payments must be made in full at the time of placing an order or
            booking a service.
          </li>
          <li>
            We accept payments via credit/debit card, net banking, UPI, and
            other digital payment methods as specified on our website.
          </li>
          <li>
            By placing an order or booking a service, you agree to pay the full
            amount due for your booking.
          </li>
        </ul>

        <h2>5. No Guarantees on Outcomes</h2>
        <p>
          While we offer spiritual services to assist with devotion, the outcome
          of these services may vary depending on individual belief and faith.
          We do not guarantee any specific results from the use of our services.
        </p>

        <h2>6. Privacy Policy</h2>
        <p>
          Your privacy is important to us. For information on how we collect,
          use, and protect your data, please refer to our Privacy Policy, which
          is available on our website.
        </p>

        <h2>7. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Vedic Vaibhav shall not be
          liable for any damages, losses, or expenses incurred due to the use of
          our services or website, including but not limited to indirect,
          incidental, or consequential damages.
        </p>

        <h2>8. Intellectual Property</h2>
        <p>
          All content on the Vedic Vaibhav website, including text, images,
          logos, and other materials, is owned by Vedic Vaibhav and protected by
          copyright and intellectual property laws. You may not reproduce,
          modify, or distribute any content without prior written permission.
        </p>

        <h2>9. Termination of Services</h2>
        <p>
          Vedic Vaibhav reserves the right to suspend or terminate access to our
          services if you violate these Terms and Conditions or engage in any
          unlawful or harmful activities.
        </p>

        <h2>10. Dispute Resolution</h2>
        <p>
          Any disputes arising out of or related to these Terms and Conditions
          shall be resolved through mediation. If mediation fails, disputes will
          be resolved in the courts of [applicable region/state].
        </p>

        <h2>11. Changes to Terms</h2>
        <p>
          Vedic Vaibhav reserves the right to modify or update these Terms and
          Conditions at any time. Any changes will be effective immediately upon
          posting on the website. It is your responsibility to review the Terms
          periodically for updates.
        </p>

        <h2>12. Contact Information</h2>
        <p>
          If you have any questions or concerns regarding these Terms and
          Conditions, please contact us at:
        </p>
        <p>
          <strong> Mobile No.</strong> : +91 9872788769
        </p>
      </div>
    </div>
  );
};
