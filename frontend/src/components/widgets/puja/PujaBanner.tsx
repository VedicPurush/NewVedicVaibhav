"use client";

import { Col } from "antd";

const PujaBanner = () => {
  return (
    <div>
      <Col xl={24} lg={24} md={24} xs={0} sm={0}>
    <div style={{ position: "relative" }}>
      <img loading="lazy" 
        src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/pujabanner.png"
        style={{ width: "100%" }}
      ></img>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontFamily: "Inknut Antiqua, serif",
          color: "white",
          fontSize: "38px",
          textAlign: "center",
        }}
      >
        Book Pooja In Temples Across India{" "}
      </div>
      
    </div>
      </Col>



      <Col xl={0} lg={0} md={0} xs={24} sm={24}>
    <div style={{ position: "relative" }}>
      <img loading="lazy" 
        src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/bookpujabanner.png"
        style={{ width: "100%" }}
      ></img>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontFamily: "Inknut Antiqua, serif",
          color: "white",
          fontSize: "16px",
          textAlign: "center",
          width:'70%', 
          display:'flex',
          flexDirection:'column'
        }}
      >
        <span style={{fontFamily: "Inknut Antiqua, serif", fontSize:"26px"}}>Book Pooja In</span>
        <span style={{fontFamily: "Inknut Antiqua, serif", fontSize:"26px"}}>Temple</span>
        <span style={{fontFamily: "Inknut Antiqua, serif", fontSize:"26px"}}>Across India</span>
      </div>
      
    </div>
      </Col>

      </div>
  );
};

export default PujaBanner;
