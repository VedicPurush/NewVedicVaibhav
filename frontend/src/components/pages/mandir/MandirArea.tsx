"use client";

import { useParams } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import MandirBanner from '@/components/widgets/mandir/MandirBanner';
import MandirSearch from "@/components/widgets/mandir/MandirSearch";
import MandirList from '@/components/widgets/mandir/MandirList';
import MandirChange from '@/components/widgets/mandir/MandirChange';
import { useEffect } from 'react';

const Area = {
    'north': {
        name: 'North',
        NAME: 'NORTH',
        src: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/north_banner.png',
        data: {
            data1: [
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/banke_bihari.png', name: 'Shri. Banke Bihari Prasad', location: 'Vrindavan, Uttar Pradesh', id: 'banke-bihari' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/vaishno_devi.png', name: 'Maa Vaishno Devi', location: 'Katra, Jammu & Kashmir', id: 'vaishno-devi' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/kalka_ji.png', name: 'Shri. Kalka Ji', location: 'Nehru place, New Delhi', id: 'kalka-ji' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/badrinath.png', name: 'Shri. Badrinath Mandir', location: 'Uttarakhand', id: 'badrinath' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/vajreshwari.png', name: 'Shri. Vajreshwari Devi Mandir', location: 'Kangra, Himachal Pradesh', id: 'vajreshwari-devi' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/kedarnath.png', name: 'Kedarnath Mandir', location: 'Uttarakhand', id: 'kedarnath' },
            ],
            data2: [
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/banke_bihari.png', name: 'Shri. Banke Bihari Prasad', location: 'Vrindavan, Uttar Pradesh', id: 'banke-bihari' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/vaishno_devi.png', name: 'Maa Vaishno Devi', location: 'Katra, Jammu & Kashmir', id: 'vaishno-devi' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/kalka_ji.png', name: 'Shri. Kalka Ji', location: 'Nehru place, New Delhi', id: 'kalka-ji' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/badrinath.png', name: 'Shri. Badrinath Mandir', location: 'Uttarakhand', id: 'badrinath' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/vajreshwari.png', name: 'Shri. Vajreshwari Devi Mandir', location: 'Kangra, Himachal Pradesh', id: 'vajreshwari-devi' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/kedarnath.png', name: 'Kedarnath Mandir', location: 'Uttarakhand', id: 'kedarnath' },
            ]
        },
        options: [
            { value: 'Shri. Banke Bihari Prasad (Vrindavan, UP)', navUrl: '/mandir/banke-bihari'},
            { value: 'Maa Vaishno Devi (Katra, J&K)', navUrl: '/mandir/vaishno-devi' },
            { value: 'Shri. Kalka Ji (Nehru Place, New Delhi)', navUrl: '/mandir/kalka-ji' },
            { value: 'Shri. Badrinath Mandir (Uttarakhand)', navUrl: '/mandir/badrinath' },
            { value: 'Shri. Vajreshwari Devi Mandir (Kangra, HP)', navUrl: '/mandir/vajreshwari-devi' },
            { value: 'Kedarnath Mandir (Uttarakhand)', navUrl: '/mandir/kedarnath' }
        ]
    },
    'east': {
        name: 'East',
        NAME: 'EAST',
        src: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/north_banner.png',
        data: {
            data1: [
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/banke_bihari.png', name: 'Shri. Banke Bihari Prasad', location: 'Vrindavan, Uttar Pradesh', id: 'banke-bihari' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/vaishno_devi.png', name: 'Maa Vaishno Devi', location: 'Katra, Jammu & Kashmir', id: 'vaishno-devi' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/kalka_ji.png', name: 'Shri. Kalka Ji', location: 'Nehru place, New Delhi', id: 'kalka-ji' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/badrinath.png', name: 'Shri. Badrinath Mandir', location: 'Uttarakhand', id: 'badrinath' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/vajreshwari.png', name: 'Shri. Vajreshwari Devi Mandir', location: 'Kangra, Himachal Pradesh', id: 'vajreshwari-devi' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/kedarnath.png', name: 'Kedarnath Mandir', location: 'Uttarakhand', id: 'kedarnath' },
            ],
            data2: [
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/banke_bihari.png', name: 'Shri. Banke Bihari Prasad', location: 'Vrindavan, Uttar Pradesh', id: 'banke-bihari' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/vaishno_devi.png', name: 'Maa Vaishno Devi', location: 'Katra, Jammu & Kashmir', id: 'vaishno-devi' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/kalka_ji.png', name: 'Shri. Kalka Ji', location: 'Nehru place, New Delhi', id: 'kalka-ji' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/badrinath.png', name: 'Shri. Badrinath Mandir', location: 'Uttarakhand', id: 'badrinath' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/vajreshwari.png', name: 'Shri. Vajreshwari Devi Mandir', location: 'Kangra, Himachal Pradesh', id: 'vajreshwari-devi' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/kedarnath.png', name: 'Kedarnath Mandir', location: 'Uttarakhand', id: 'kedarnath' },
            ]
        },
        options: [
            { value: 'Shri. Banke Bihari Prasad (Vrindavan, UP)', navUrl: '/'},
            { value: 'Maa Vaishno Devi (Katra, J&K)', navUrl: '/' },
            { value: 'Shri. Kalka Ji (Nehru Place, New Delhi)', navUrl: '/' },
            { value: 'Shri. Badrinath Mandir (Uttarakhand)', navUrl: '/' },
            { value: 'Shri. Vajreshwari Devi Mandir (Kangra, HP)', navUrl: '/' },
            { value: 'Kedarnath Mandir (Uttarakhand)', navUrl: '/' }
        ]
    },
    'west': {
        name: 'West',
        NAME: 'WEST',
        src: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/north_banner.png',
        data: {
            data1: [
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/banke_bihari.png', name: 'Shri. Banke Bihari Prasad', location: 'Vrindavan, Uttar Pradesh', id: 'banke-bihari' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/vaishno_devi.png', name: 'Maa Vaishno Devi', location: 'Katra, Jammu & Kashmir', id: 'vaishno-devi' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/kalka_ji.png', name: 'Shri. Kalka Ji', location: 'Nehru place, New Delhi', id: 'kalka-ji' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/badrinath.png', name: 'Shri. Badrinath Mandir', location: 'Uttarakhand', id: 'badrinath' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/vajreshwari.png', name: 'Shri. Vajreshwari Devi Mandir', location: 'Kangra, Himachal Pradesh', id: 'vajreshwari-devi' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/kedarnath.png', name: 'Kedarnath Mandir', location: 'Uttarakhand', id: 'kedarnath' },
            ],
            data2: [
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/banke_bihari.png', name: 'Shri. Banke Bihari Prasad', location: 'Vrindavan, Uttar Pradesh', id: 'banke-bihari' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/vaishno_devi.png', name: 'Maa Vaishno Devi', location: 'Katra, Jammu & Kashmir', id: 'vaishno-devi' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/kalka_ji.png', name: 'Shri. Kalka Ji', location: 'Nehru place, New Delhi', id: 'kalka-ji' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/badrinath.png', name: 'Shri. Badrinath Mandir', location: 'Uttarakhand', id: 'badrinath' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/vajreshwari.png', name: 'Shri. Vajreshwari Devi Mandir', location: 'Kangra, Himachal Pradesh', id: 'vajreshwari-devi' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/kedarnath.png', name: 'Kedarnath Mandir', location: 'Uttarakhand', id: 'kedarnath' },
            ]
        },
        options: [
            { value: 'Shri. Banke Bihari Prasad (Vrindavan, UP)', navUrl: '/'},
            { value: 'Maa Vaishno Devi (Katra, J&K)', navUrl: '/' },
            { value: 'Shri. Kalka Ji (Nehru Place, New Delhi)', navUrl: '/' },
            { value: 'Shri. Badrinath Mandir (Uttarakhand)', navUrl: '/' },
            { value: 'Shri. Vajreshwari Devi Mandir (Kangra, HP)', navUrl: '/' },
            { value: 'Kedarnath Mandir (Uttarakhand)', navUrl: '/' }
        ]
    },
    'south': {
        name: 'South',
        NAME: 'SOUTH',
        src: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/north_banner.png',
        data: {
            data1: [
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/banke_bihari.png', name: 'Shri. Banke Bihari Prasad', location: 'Vrindavan, Uttar Pradesh', id: 'banke-bihari' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/vaishno_devi.png', name: 'Maa Vaishno Devi', location: 'Katra, Jammu & Kashmir', id: 'vaishno-devi' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/kalka_ji.png', name: 'Shri. Kalka Ji', location: 'Nehru place, New Delhi', id: 'kalka-ji' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/badrinath.png', name: 'Shri. Badrinath Mandir', location: 'Uttarakhand', id: 'badrinath' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/vajreshwari.png', name: 'Shri. Vajreshwari Devi Mandir', location: 'Kangra, Himachal Pradesh', id: 'vajreshwari-devi' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/kedarnath.png', name: 'Kedarnath Mandir', location: 'Uttarakhand', id: 'kedarnath' },
            ],
            data2: [
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/banke_bihari.png', name: 'Shri. Banke Bihari Prasad', location: 'Vrindavan, Uttar Pradesh', id: 'banke-bihari' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/vaishno_devi.png', name: 'Maa Vaishno Devi', location: 'Katra, Jammu & Kashmir', id: 'vaishno-devi' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/kalka_ji.png', name: 'Shri. Kalka Ji', location: 'Nehru place, New Delhi', id: 'kalka-ji' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/badrinath.png', name: 'Shri. Badrinath Mandir', location: 'Uttarakhand', id: 'badrinath' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/vajreshwari.png', name: 'Shri. Vajreshwari Devi Mandir', location: 'Kangra, Himachal Pradesh', id: 'vajreshwari-devi' },
                { image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/kedarnath.png', name: 'Kedarnath Mandir', location: 'Uttarakhand', id: 'kedarnath' },
            ]
        },
        options: [
            { value: 'Shri. Banke Bihari Prasad (Vrindavan, UP)', navUrl: '/'},
            { value: 'Maa Vaishno Devi (Katra, J&K)', navUrl: '/' },
            { value: 'Shri. Kalka Ji (Nehru Place, New Delhi)', navUrl: '/' },
            { value: 'Shri. Badrinath Mandir (Uttarakhand)', navUrl: '/' },
            { value: 'Shri. Vajreshwari Devi Mandir (Kangra, HP)', navUrl: '/' },
            { value: 'Kedarnath Mandir (Uttarakhand)', navUrl: '/' }
        ]
    },
};

const MandirArea = () => {
    return (
        <div>
            <Layout content={<MandirAreaContent />} />
        </div>
    )
}

export default MandirArea


const MandirAreaContent = () => {

    const params = useParams<{ id: string }>();
    const id = params?.id as keyof typeof Area;
    const area = Area[id];

    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
    }, [id]);

    if (!area) {
        return <div>
            Region Not Found
        </div>;
    }

    return (
        <div style={{ backgroundColor: '#F8F7F4', border: '1px solid transparent' }}>
            <MandirBanner heading={area.name} imgSrc={area.src} />
            <MandirSearch heading={area.NAME} options={area.options} />
            <MandirList data={area.data} />
            <MandirChange />
        </div>
    )
}
