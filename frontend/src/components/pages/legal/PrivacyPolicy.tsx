"use client";

import './PrivacyPolicy.css'
import Layout from "@/components/layout/Layout";

const PrivacyPolicy = () => {
    return(
    <Layout content={<PrivacyPolicyContent/>}/>
    )
}

export default PrivacyPolicy


const PrivacyPolicyContent =()=>{
  return (
    <div style={{width:'100%'}}>
    <img loading="lazy"  src='https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/overall_images/terms.png' style={{marginBottom:'4%'}}></img>

<div className="terms-container">
  <h1 className="terms-header">Privacy Policy</h1>
  <p>
    Welcome to Vedic Vaibhav! By using our website (<a href="https://vedicvaibhav.com">vedicvaibhav.com</a>) and services, you agree to the following privacy policies. Please read them carefully.
  </p>

  <h3 style={{fontWeight:"600", marginTop:'1%'}}>1. Introduction</h3>
  <p>At Vedic Vaibhav, we are committed to protecting your privacy. This Privacy Policy outlines how we collect, use, and safeguard your personal information when you visit our website.
  </p>

  <h3 style={{fontWeight:"600", marginTop:'1%'}}>2. Information We Collect</h3>
  <p>We collect information that you provide when you book a pooja, including your name, email address, phone number, and payment information.
  </p>

  <h3 style={{fontWeight:"600", marginTop:'1%'}}>3. How We Use Your Information</h3>
  <p>We use your information to process bookings, communicate with you about your services, and improve our offerings. We do not sell or share your personal information with third parties without your consent.
  </p>

  <h3 style={{fontWeight:"600", marginTop:'1%'}}>4. Data Security </h3>
  <p>We implement various security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure. </p>

  <h3 style={{fontWeight:"600", marginTop:'1%'}}>5. Cookies</h3>
  <p>
Our website uses cookies to enhance your browsing experience. You can choose to accept or decline cookies through your browser settings.
  </p>

  <h3 style={{fontWeight:"600", marginTop:'1%'}}>6. Changes to This Policy  </h3>
  <p>
  We may update this Privacy Policy from time to time. Any changes will be posted on this page, and your continued use of the site constitutes acceptance of those changes
  </p>


  <p style={{marginBlock:"2%"}}>
    Thank You<br />
    <strong style={{fontSize:'16px', color:'#FF6505'}}>Regards, Vedic Vaibhav</strong>
  </p>
</div>
</div>
  )

}
