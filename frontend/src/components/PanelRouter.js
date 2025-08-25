import React from 'react';
import { useParams } from 'react-router-dom';
import CorporatePanel from './CorporatePanel';
import CateringPanel from './CateringPanel';
import SupplierPanel from './SupplierPanel';

const PanelRouter = () => {
  const { encCompanyType } = useParams();

  // Decode the company type to determine which panel to render
  const decodePathSegment = (encoded) => {
    try {
      const [payloadB64] = encoded.split('.');
      const padding = '='.repeat((4 - payloadB64.length % 4) % 4);
      const payload = JSON.parse(atob(payloadB64 + padding));
      return payload;
    } catch (e) {
      console.error('Path segment decode error:', e);
      return null;
    }
  };

  const getCompanyTypeFromPath = () => {
    const decoded = decodePathSegment(encCompanyType);
    return decoded?.company_type;
  };

  const companyType = getCompanyTypeFromPath();

  // Route to appropriate panel based on company type
  switch (companyType) {
    case 'corporate':
      return <CorporatePanel />;
    case 'catering':
      return <CateringPanel />;
    case 'supplier':
      return <SupplierPanel />;
    default:
      // Fallback to corporate panel if type cannot be determined
      return <CorporatePanel />;
  }
};

export default PanelRouter;