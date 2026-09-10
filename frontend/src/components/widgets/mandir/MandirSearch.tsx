"use client";

import { AutoComplete, Col, Input, Row } from "antd";
import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

type OptionType = { value: string, navUrl: string };

const MandirSearch = ({ heading, options }: { heading: string, options: OptionType[] }) => {
    return (
        <div>
            <Col xl={24} lg={24} md={24} xs={0} sm={0}>
            <div style={{ marginLeft: '6%', marginRight: '6%' }}>
            <Row style={{ alignItems: 'center', marginTop: '7%', marginBottom: '3%' }}>
                <Col span={14}>
                    <Row style={{ color: '#F24E1E', fontSize: '20px' }}>
                        DISCOVER
                    </Row>
                    <Row style={{ color: '#4B4B4A', fontSize: '32px', fontWeight: '700' }}>
                        LIST OF MANDIR
                    </Row>
                    <Row style={{ color: '#63687B', fontSize: '32px' }}>
                        IN {heading} INDIA
                    </Row>
                </Col>
                <Col span={10}>
                    <Search options={options} />
                </Col>
            </Row>
        </div>
            </Col>

            <Col xl={0} lg={0} md={0} xs={24} sm={24}>
            <div style={{ marginLeft: '6%', marginRight: '6%' }}>
            <Row style={{ alignItems: 'center', marginTop: '7%', marginBottom: '3%' }}>
                <Col span={10}>
                    <Row style={{ color: '#F24E1E', fontSize: '14px' }}>
                        DISCOVER
                    </Row>
                    <Row style={{ color: '#4B4B4A', fontSize: '16px', fontWeight: '700' }}>
                        LIST OF MANDIR
                    </Row>
                    <Row style={{ color: '#63687B', fontSize: '16px' }}>
                        IN {heading} INDIA
                    </Row>
                </Col>
                <Col span={14}>
                    <Search options={options} />
                </Col>
            </Row>
        </div>
            </Col>
        </div>
        
    );
}

export default MandirSearch;

const Search = ({ options }: { options: OptionType[] }) => {

    const router = useRouter();

    const handlePressEnter = (e: KeyboardEvent<HTMLInputElement>) => {
        const selectedOption = options.find(option => option.value === (e.target as HTMLInputElement).value);
        if (selectedOption) {
            router.push(selectedOption.navUrl);
        }
    };

    const handleSearchClick = () => {
        const selectedOption = options.find(option => option.value === (document.querySelector('input.ant-input') as HTMLInputElement).value);
        if (selectedOption) {
            router.push(selectedOption.navUrl);
        }
    };


    return (
        <AutoComplete
            options={options}
            filterOption={(inputValue, option) =>
                option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
            }
            allowClear={false}
            style={{ width: '100%' }}
            onSelect={value => {
                const selectedOption = options.find(option => option.value === value);
                if (selectedOption) {
                    router.push(selectedOption.navUrl);
                }
            }}
        >
            <Input
                placeholder='Search Mandir here'
                suffix={
                    <div onClick={handleSearchClick} style={{ borderRadius: '5vw', display: 'flex', alignItems: 'center' }}>
                        <img loading="lazy"  src='/images/mandir/mandir_search.png' width='50rem' height='35rem' style={{ marginLeft: 'auto' }}  />
                    </div>
                }
                onPressEnter={handlePressEnter}
                style={{
                    backgroundColor: 'transparent',
                    border: '1px solid black',
                    borderRadius: '5vw',
                    color: 'black',
                    fontSize: '1rem',
                    width: '100%',
                }}
            />
        </AutoComplete>
    );
}
