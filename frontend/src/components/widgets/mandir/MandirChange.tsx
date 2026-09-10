"use client";

import { Col, Row } from "antd"
import { useRouter } from "next/navigation";
import "@/components/widgets/home/Mandir.css";

const MandirChange = () => {

    const router = useRouter();

    return (
        <div>
            <Col xl={24} lg={24} md={24} xs={0} sm={0}>
            <div style={{ paddingLeft: '6%', paddingRight: '6%', backgroundColor: '#093649', paddingTop: '3%', paddingBottom: '5%' }}>
            <Row justify='center' style={{ color: '#F8F7F4', fontSize: '20px', alignItems: 'end', gap: '1%', marginBottom: '2%' }}>
                <div style={{ width: '2%' }}>
                    <img loading="lazy"  src='https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/discover_mandir.png' width='100%'  />
                </div>
                DISCOVER SACRED SITES BEYOND BORDERS
                <div style={{ width: '2%' }}>
                    <img loading="lazy"  src='https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/discover_mandir.png' width='100%'  />
                </div>
            </Row>
            <Row justify='center' style={{ color: '#FF6505', fontSize: '32px', fontWeight: '500' }}>
                EXPLORE TEMPLE IN
            </Row>
            <Row justify='center' style={{ color: 'rgba(255,255,255,0.8)', fontSize: '32px' }}>
                OTHER REGIONS
            </Row>
            <Row style={{marginTop: '5%'}}>
                <Col span={6} style={{ padding: '1%' }} onClick={() => router.push('/mandir/area/east')}>
                    <img loading="lazy"  src='https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/home-images/east_mandir.png' width='100%' className="hover-mandir"  />
                </Col>
                <Col span={6} style={{ padding: '1%' }} onClick={() => router.push('/mandir/area/west')}>
                    <img loading="lazy"  src='https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/home-images/west_mandir.png' width='100%' className="hover-mandir"  />
                </Col>
                <Col span={6} style={{ padding: '1%' }} onClick={() => router.push('/mandir/area/north')}>
                    <img loading="lazy"  src='https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/home-images/north_mandir.png' width='100%' className="hover-mandir"  />
                </Col>
                <Col span={6} style={{ padding: '1%' }} onClick={() => router.push('/mandir/area/south')}>
                    <img loading="lazy"  src='https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/home-images/south_mandir.png' width='100%' className="hover-mandir"  />
                </Col>
            </Row>
        </div>
            </Col>


            <Col xl={0} lg={0} md={0} xs={24} sm={24}>
            <div style={{ paddingLeft: '2%', paddingRight: '2%', backgroundColor: '#093649', paddingTop: '3%', paddingBottom: '5%' }}>
            <Row justify='center' style={{ color: '#F8F7F4', fontSize: '12px', alignItems: 'end', gap: '1%', marginBottom: '2%' }}>
                <div style={{ width: '2%' }}>
                    <img loading="lazy"  src='https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/discover_mandir.png' width='100%'  />
                </div>
                DISCOVER SACRED SITES BEYOND BORDERS
                <div style={{ width: '2%' }}>
                    <img loading="lazy"  src='https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/discover_mandir.png' width='100%'  />
                </div>
            </Row>
            <Row justify='center' style={{ color: '#FF6505', fontSize: '16px', fontWeight: '500' }}>
                EXPLORE TEMPLE IN
            </Row>
            <Row justify='center' style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px'}}>
                OTHER REGIONS
            </Row>
            <Row style={{marginTop: '5%'}}>
                <Col span={6} style={{ padding: '1%' }} onClick={() => router.push('/mandir/area/east')}>
                    <img loading="lazy"  src='https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/home-images/east_mandir.png' width='100%' className="hover-mandir"  />
                </Col>
                <Col span={6} style={{ padding: '1%' }} onClick={() => router.push('/mandir/area/west')}>
                    <img loading="lazy"  src='https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/home-images/west_mandir.png' width='100%' className="hover-mandir"  />
                </Col>
                <Col span={6} style={{ padding: '1%' }} onClick={() => router.push('/mandir/area/north')}>
                    <img loading="lazy"  src='https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/home-images/north_mandir.png' width='100%' className="hover-mandir"  />
                </Col>
                <Col span={6} style={{ padding: '1%' }} onClick={() => router.push('/mandir/area/south')}>
                    <img loading="lazy"  src='https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/home-images/south_mandir.png' width='100%' className="hover-mandir"  />
                </Col>
            </Row>
        </div>
            </Col>
        </div>
        
    )
}

export default MandirChange
