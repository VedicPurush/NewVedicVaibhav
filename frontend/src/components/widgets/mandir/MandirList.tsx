"use client";

import { Carousel, Row, Col } from "antd";
import { useRouter } from "next/navigation";
import { buildDetailSlug } from "@/lib/slug";

type DataType = { image: string; name: string; location: string; id: string };

const MandirList = ({ data }: { data: { [key: string]: DataType[] } }) => {
    return (
        <div>
            <Col xl={24} lg={24} md={24} xs={0} sm={0}>
            <Carousel arrows={true} dots={false} draggable={true} infinite={true} style={{ marginLeft: '2%', marginRight: '2%', marginBottom: '3%' }}>
            {Object.keys(data).map((key) => (
                <Slide key={key} data={data[key]} />
            ))}
        </Carousel>
            </Col>

            <Col xl={0} lg={0} md={0} xs={24} sm={24}>
            <Carousel arrows={true} dots={false} draggable={true} infinite={true} style={{ marginLeft: '0%', marginRight: '0%', marginTop:'7%', marginBottom: '3%' }}>
            {Object.keys(data).map((key) => (
                <Slide key={key} data={data[key]} />
            ))}
        </Carousel>
            </Col>
        </div>
        
    );
};

export default MandirList;

const Slide = ({ data }: { data: DataType[] }) => {
    const router = useRouter();
    return (
        <div> 
            <Col xl={24} lg={24} md={24} sm={0} xs={0}>
            <Row>
            <Row justify='center'>
                {data.map((item, index) => (
                    <Col span={7} style={{ position: 'relative', margin: '1%' }} key={index} onClick={() => router.push(`/mandir/${buildDetailSlug(item.name, item.id)}`)}>
                        <img loading="lazy"  src={item.image} width='100%' />
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', whiteSpace: 'nowrap', textAlign: 'center' }}>
                            <div style={{ fontSize: '16px', fontWeight: '500' }}>
                                {item.name}
                            </div>
                            <div style={{ fontSize: '14px' }}>
                                {item.location}
                            </div>
                        </div>
                    </Col>
                ))}
            </Row>
        </Row>
            </Col>


            <Col xl={0} lg={0} md={0} sm={24} xs={24}>
            <Row>
            <Row justify='center'>
                {data.map((item, index) => (
                    <Col span={11} style={{ position: 'relative', margin: '1.2%' }} key={index} onClick={() => router.push(`/mandir/${buildDetailSlug(item.name, item.id)}`)}>
                        <img loading="lazy"  src={item.image} width='100%' height='100vh' />
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', whiteSpace: 'nowrap', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', fontWeight: '900' }}>
                                {item.name}
                            </div>
                            <div style={{ fontSize: '11px' , fontWeight:'500'}}>
                                {item.location}
                            </div>
                        </div>
                    </Col>
                ))}
            </Row>
        </Row>
            </Col>
        </div>
        
    );
};
