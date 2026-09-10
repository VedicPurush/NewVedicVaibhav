"use client";

import { Col, Row } from "antd"

const MandirBanner = ({heading, imgSrc }: {heading: string, imgSrc: string}) => {
    return (
        <div>
            <Col xl={24} lg={24} md={24} sm={0} xs={0}>
            <div style={{ marginLeft: '6%', marginRight: '6%' }}>
            <Row justify='center'>
                <div style={{ color: '#FF7722', border: '1px solid #FF7722', padding: '1%', borderRadius: '5vw', fontWeight: '500', cursor: 'pointer', marginTop: '5%', marginBottom: '2%' }}>
                    Blessed from god, at your doorstep
                </div>
            </Row>
            <Row justify='center'>
                <div style={{ color: 'rgba(0,0,0,0.8)', fontWeight: 'bold', fontSize: '64px', marginBottom: '2%' }}>
                    {heading} India Mandir
                </div>
            </Row>
            <Row>
                <img loading="lazy"  src={`${imgSrc}`} width='100%'  />
            </Row>
        </div>
        </Col>

        <Col xl={0} lg={0} md={0} sm={24} xs={24}>
            <div style={{ marginLeft: '2%', marginRight: '2%', marginTop:'6%' }}>
            <Row justify='center'>
                <div style={{ color: '#FF7722', border: '1px solid #FF7722', padding: '2%', borderRadius: '5vw', fontWeight: '500', cursor: 'pointer', marginTop: '5%', marginBottom: '2%' }}>
                    Blessed from god, at your doorstep
                </div>
            </Row>
            <Row justify='center' style={{width:'100%', alignItems:'center'}}>
                <div style={{ color: 'rgba(0,0,0)', fontWeight: 900, fontSize: '24px', marginBottom: '2%', marginRight:'1%' }}>
                    {heading} India Mandir
                    
                </div>
                <img loading="lazy"  src='https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/temple_icon.png' width='45px'  />
            </Row>
            <Row>
                <img loading="lazy"  src={`${imgSrc}`} width='100%'  />
            </Row>
        </div>
        </Col>
        </div>
        
    )
}

export default MandirBanner
