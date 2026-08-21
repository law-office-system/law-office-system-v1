import React from 'react';
import { useParams } from 'react-router-dom';
import LegalEditor from '../components/LegalEditor';
import { useAuth } from '../context/AuthContext';

const DocumentEditor = () => {
  const { docId } = useParams();
  const { currentUser, userData } = useAuth();

  // Multi-Tenant: tenantId = officeId
  const tenantId = userData?.officeId || 'default_office';
  const documentId = docId || `doc_${Date.now()}`;

  return (
    <LegalEditor
      tenantId={tenantId}
      documentId={documentId}
      userId={currentUser?.uid}
      userName={userData?.fullName || userData?.name || 'محامٍ'}
    />
  );
};

export default DocumentEditor;