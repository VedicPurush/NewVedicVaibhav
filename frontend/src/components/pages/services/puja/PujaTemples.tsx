"use client";

import { Row, Col } from "antd";
import { useParams } from "next/navigation";
import PujaTempleCard from "@/components/widgets/puja/PujaTempleCard";
import PujaBanner from "@/components/widgets/puja/PujaBanner";
import Layout from "@/components/layout/Layout";
import { useAllPoojasQuery } from "@/hooks/queries/usePoojaQueries";
import { useActiveMandirsQuery } from "@/hooks/queries/useMandirQueries";

const PujaTemples = () => {
  return (
    <div>
      <Layout content={<PujaTemplesContent />} />
    </div>
  );
};

export default PujaTemples;

const PujaTemplesContent = () => {
  const { id } = useParams<{ id: string }>(); // Extracting the 'id' from the URL
  const { data: allPoojas = [] } = useAllPoojasQuery();

  const selectedPuja = allPoojas.find((puja: any) => puja._id === id);

  // One shared, cached request for every active mandir instead of a separate
  // round trip per temple in this puja's mandirLists — same fan-out fix as
  // PujaPage.tsx / Puja.tsx, applied here for the same reason (slow loads).
  const { data: activeMandirs = [] } = useActiveMandirsQuery();
  const mandirById = new Map((activeMandirs || []).map((m: any) => [String(m._id), m]));

  // Combine query results — the layout below expects a { mandir: ... } wrapper.
  const templeData = (selectedPuja?.mandirLists || [])
    .map((m: any) => {
      const mandir = mandirById.get(String(m.mandirId?._id));
      return mandir ? { mandir } : null;
    })
    .filter(Boolean); // Filter out nulls if the temple isn't in the active list

  return (
    <div>
      <Col xl={24} lg={24} md={24} xs={0} sm={0}>
        <div style={{ paddingInline: "6%" }}>
          <PujaBanner />
          {selectedPuja && templeData.length > 0 ? (
            <Row style={{ marginBlock: "5%" }} gutter={[10, 10]}>
              {templeData.map((temple: any, index: number) => (
                <Col key={index} span={6}>
                  <PujaTempleCard
                    id={id}
                    benefit={selectedPuja.poojaBenefits}
                    discountedprice={
                      selectedPuja.mandirLists[index]?.discountPrice
                    }
                    templeid={temple.mandir._id}
                    imgSrc={temple.mandir.mandirPoojaImage}
                    originalprice={
                      selectedPuja.mandirLists[index]?.originalPrice
                    }
                    TemplenameHindi={temple.mandir.nameHindi}
                    TemplenameEnglish={temple.mandir.nameEnglish}
                    MoolMantra={selectedPuja.moolmantra}
                  />
                </Col>
              ))}
            </Row>
          ) : (
            <div>No Puja or Temple found!</div>
          )}
        </div>
      </Col>
      <Col xl={0} lg={0} md={0} xs={24} sm={24}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <PujaBanner />
          <div style={{ paddingInline: "3.5%" }}>
            {selectedPuja && templeData.length > 0 ? (
              <Row style={{ marginBlock: "5%" }} gutter={[16, 16]}>
                {templeData.map((temple: any, index: number) => (
                  <Col key={index} span={24}>
                    <PujaTempleCard
                      id={id}
                      benefit={selectedPuja.poojaBenefits}
                      discountedprice={
                        selectedPuja.mandirLists[index]?.discountPrice
                      }
                      templeid={temple.mandir._id}
                      imgSrc={temple.mandir.mandirPoojaImage}
                      originalprice={
                        selectedPuja.mandirLists[index]?.originalPrice
                      }
                      TemplenameHindi={temple.mandir.nameHindi}
                      TemplenameEnglish={temple.mandir.nameEnglish}
                      MoolMantra={selectedPuja.moolmantra}
                    />
                  </Col>
                ))}
              </Row>
            ) : (
              <div>No Puja or Temple found!</div>
            )}
          </div>
        </div>
      </Col>
    </div>
  );
};
