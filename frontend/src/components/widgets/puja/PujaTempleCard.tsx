"use client";

import ArrowForward from '@mui/icons-material/ArrowForward';
import LocationOn from '@mui/icons-material/LocationOn';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import { Col } from 'antd';

import { useRouter } from "next/navigation";
import { useMoney } from "@/lib/currency";

const PujaTempleCard = ({id,originalprice, discountedprice,  templeid, benefit, imgSrc, TemplenameHindi, TemplenameEnglish, MoolMantra }:{originalprice:any, discountedprice:any, benefit:any ,id:any, templeid:any,TemplenameEnglish:any, imgSrc:any, TemplenameHindi:any, MoolMantra:string}) => {
    /** Prices display in the devotee's own currency; the India list price is
     *  the input and the server owns the markup. See lib/currency.ts. */
    const { money } = useMoney();
    const router = useRouter();
    
    const clickbookpuja = () => {
      localStorage.setItem('Pooja Booking', JSON.stringify("temple ID"));
      router.push(`/services/puja/${id}/allpujas/${templeid}`);
  };
  
  return (
    <div>

<Col xl={24} lg={24} md={24} xs={0} sm={0}>
    <div onClick={clickbookpuja} style={{ border: '1px solid rgba(0,0,0,0.2)', boxShadow:'0px 0px 4px 0px rgba(0,0,0,0.25)', borderRadius: '17px', padding: '0%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ width: '100%', position: 'relative' }}>
        <img loading="lazy"  src={imgSrc} style={{ width: '100%', borderRadius: '16px'}}  />
        <div style={{fontFamily:'Hind', position: 'absolute', bottom: "0%", width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(to right, #0CD5F2, #38717B)', color: 'white', paddingTop: '1%', fontSize:'18px' }}>
          {MoolMantra}
        </div>
      </div>
      <div style={{padding:'1.5%'}}>
      <div style={{fontWeight:'500', alignItems:'start', marginTop:'1%', display:'flex', gap:'1%'}}>
        <div style={{display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
        <LocationOn style={{color:"#FF7722"}}/>
        
        
        </div>
        <div style={{display:'flex', flexDirection:'column', fontFamily:'Hind', color:"#FF7722", fontSize:'18px' }}>
        {TemplenameHindi}
        <div style={{fontSize:'14px', fontFamily:'Poppins', fontWeight:'400', color:'black'}}>{TemplenameEnglish}</div>
        
        </div>
         
      </div>

      <div style={{display:'flex', alignItems:'center'}}>
        <HealthAndSafetyIcon style={{color:'green'}}/>
      <div style={{display:'flex', color:'black', fontSize:'12px', fontStyle:'italic', fontWeight:'400'}}> 
          <span style={{color:'rgba(0,0,0,0.8)'}}>Benefits:</span> 
          <span style={{color:'rgba(0,0,0,0.6)'}}>&nbsp;{benefit}</span>
          </div>
      </div>

      <div style={{backgroundColor:'rgba(0,0,0,0.2)', height:'1px', width:'100%', marginBlock:'2%'}}></div>
      
      <div style={{ display: 'flex', justifyContent:'space-between' }}>
        <div style={{display:'flex', flexDirection:'column'}}>
        <div style={{display:'flex',fontWeight:'500', fontSize:'18px',fontStyle:'italic', color:'black'}}>
          <span>{money(discountedprice)}</span>
        </div>
        <div style={{display:'flex',fontWeight:'500', fontSize:'14px',fontStyle:'italic', color:'rgba(0,0,0,0.4)' , textDecoration: 'line-through'}}>
          <span>{money(originalprice)}</span>
        </div>
        </div>
        
        <div onClick={clickbookpuja} style={{ color: "white",backgroundColor:'#FF7722', fontSize: '14px', cursor: 'pointer', display:'flex', height:'30px', justifyContent:'center', alignItems:'center', width:'auto', borderRadius:'25px', paddingInline:"2%" }}>Book Puja&nbsp;

          <ArrowForward/>
        </div>
      </div>

      </div>
    </div>

    </Col>



    
    <Col xl={0} lg={0} md={0} xs={24} sm={24}>
    <div onClick={clickbookpuja} style={{ border: '1px solid rgba(0,0,0,0.2)', boxShadow:'0px 0px 4px 0px rgba(0,0,0,0.25)', borderRadius: '17px', padding: '0%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ width: '100%', position: 'relative' }}>
        <img loading="lazy"  src={imgSrc} style={{ width: '100%', borderRadius: '16px'}}  />
        <div style={{fontFamily:'Hind', position: 'absolute', bottom: "0%", width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(to right, #0CD5F2, #38717B)', color: 'white', paddingTop: '1%', fontSize:'18px' }}>
          {MoolMantra}
        </div>
      </div>
      <div style={{padding:'2%'}}>
      <div style={{fontWeight:'500', alignItems:'start', marginTop:'1%', display:'flex', gap:'1%'}}>
        <div style={{display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
        <LocationOn style={{color:"#FF7722"}}/>
        
        
        </div>
        <div style={{display:'flex', flexDirection:'column', fontFamily:'Hind', color:"#FF7722", fontSize:'20px' }}>
        {TemplenameHindi}
        <div style={{fontSize:'14px', fontFamily:'Poppins', fontWeight:'400', color:'black'}}>{TemplenameEnglish}</div>
        
        </div>
         
      </div>

      <div style={{display:'flex', alignItems:'center'}}>
        <HealthAndSafetyIcon style={{color:'green'}}/>
      <div style={{display:'flex', color:'black', fontSize:'12px', fontStyle:'italic', fontWeight:'400'}}> 
          <span style={{color:'rgba(0,0,0,0.8)'}}>Benefits:</span> 
          <span style={{color:'rgba(0,0,0,0.6)'}}>&nbsp;{benefit}</span>
          </div>
      </div>

      <div style={{backgroundColor:'rgba(0,0,0,0.2)', height:'1px', width:'100%', marginBlock:'2%'}}></div>
      
      <div style={{ display: 'flex', justifyContent:'space-between' }}>
        <div style={{display:'flex', flexDirection:'column'}}>
        <div style={{display:'flex',fontWeight:'500', fontSize:'20px',fontStyle:'italic', color:'black'}}>
          <span>{money(discountedprice)}</span>
        </div>
        <div style={{display:'flex',fontWeight:'500', fontSize:'14px',fontStyle:'italic', color:'rgba(0,0,0,0.4)' , textDecoration: 'line-through'}}>
          <span>{money(originalprice)}</span>
        </div>
        </div>
        
        <div onClick={clickbookpuja} style={{ color: "white",backgroundColor:'#FF7722', fontSize: '15px', cursor: 'pointer', display:'flex', height:'30px', justifyContent:'center', alignItems:'center', width:'35%', borderRadius:'25px' }}>Book Puja&nbsp;

          <ArrowForward/>
        </div>
      </div>

      </div>
    </div>

    </Col>


    </div>
  )
}

export default PujaTempleCard
