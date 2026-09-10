"use client";

import Layout from "@/components/layout/Layout";
import MandirFilter from "@/components/widgets/mandir/MandirFilter";

const MandirMain = () => {
    return (
        <div>
            <Layout content={<MandirMainContent />} activeIndex="mandir" />
        </div>
    )
}

export default MandirMain

const MandirMainContent = () => {
    return (
        <div>
            <MandirFilter />
        </div>
    )
}
