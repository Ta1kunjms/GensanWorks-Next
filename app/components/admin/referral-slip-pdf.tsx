import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Bold.ttf', fontWeight: 'bold' }
  ]
});

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', fontSize: 10, color: '#1e293b' },
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottom: '1pt solid #cbd5e1', paddingBottom: 10, marginBottom: 15 },
  headerLeft: { flexDirection: 'row', gap: 10 },
  seal: { width: 50, height: 50, backgroundColor: '#e2e8f0', borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  sealText: { fontSize: 8, color: '#64748b' },
  headerText: { justifyContent: 'center' },
  republicText: { fontSize: 8, color: '#64748b', textTransform: 'uppercase' },
  mayorText: { fontSize: 12, fontWeight: 'bold', color: '#0f172a', marginVertical: 2 },
  pesoText: { fontSize: 10, color: '#334155' },
  cityText: { fontSize: 10, color: '#475569' },
  headerRight: { alignItems: 'flex-end', gap: 5 },
  photoBox: { width: 50, height: 60, border: '1pt solid #cbd5e1', justifyContent: 'center', alignItems: 'center' },
  qrBox: { width: 40, height: 40, border: '1pt solid #cbd5e1', justifyContent: 'center', alignItems: 'center' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15 },
  title: { fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  metaData: { alignItems: 'flex-end', fontSize: 8, color: '#475569', gap: 2 },
  recipient: { marginBottom: 15 },
  recipientTitle: { fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 },
  recipientName: { fontWeight: 'bold', fontSize: 11, marginBottom: 1 },
  body: { marginBottom: 15, lineHeight: 1.4 },
  applicantBox: { border: '1pt solid #cbd5e1', backgroundColor: '#f8fafc', padding: 10, borderRadius: 4, marginBottom: 10 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 60, color: '#64748b' },
  value: { flex: 1, fontWeight: 'bold' },
  jobBox: { border: '1pt solid #cbd5e1', backgroundColor: '#eff6ff', padding: 10, borderRadius: 4, marginBottom: 10 },
  jobTitleLabel: { fontSize: 8, textTransform: 'uppercase', color: '#64748b', marginBottom: 2 },
  jobTitle: { fontSize: 12, fontWeight: 'bold' },
  signatures: { flexDirection: 'row', marginTop: 30, marginBottom: 20 },
  signatureBlock: { flex: 1 },
  signName: { fontWeight: 'bold', fontSize: 10, borderBottom: '1pt solid #94a3b8', paddingBottom: 2, marginBottom: 2, width: 180 },
  signTitle: { fontSize: 8, color: '#475569' },
  stub: { border: '1pt dashed #cbd5e1', backgroundColor: '#f8fafc', padding: 10, borderRadius: 4, marginBottom: 10 },
  stubTitle: { fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 5 },
  footer: { backgroundColor: '#1e293b', color: '#cbd5e1', padding: 10, textAlign: 'center', fontSize: 8, marginTop: 'auto' }
});

export const ReferralSlipPdf = ({ data, qrCodeDataUrl }: { data: any, qrCodeDataUrl: string | null }) => {
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
  const formatDateTime = (iso: string) => new Date(iso).toLocaleString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.seal}><Text style={styles.sealText}>SEAL</Text></View>
            <View style={styles.headerText}>
              <Text style={styles.republicText}>Republic of the Philippines</Text>
              <Text style={styles.mayorText}>OFFICE OF THE CITY MAYOR</Text>
              <Text style={styles.pesoText}>Public Employment Service Office</Text>
              <Text style={styles.cityText}>General Santos City</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.photoBox}><Text style={styles.sealText}>Photo</Text></View>
            {qrCodeDataUrl ? <Image src={qrCodeDataUrl} style={styles.qrBox} /> : <View style={styles.qrBox} />}
          </View>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>Referral Slip</Text>
          <View style={styles.metaData}>
            <Text><Text style={{ fontWeight: 'bold' }}>Slip No:</Text> {data.slipNumber}</Text>
            <Text><Text style={{ fontWeight: 'bold' }}>Date Issued:</Text> {formatDateTime(data.issuedAt)}</Text>
            <Text><Text style={{ fontWeight: 'bold' }}>Valid Until:</Text> {formatDate(data.validUntil)}</Text>
          </View>
        </View>

        <View style={styles.recipient}>
          <Text style={styles.recipientTitle}>The Personnel Manager</Text>
          <Text style={styles.recipientName}>{data.employer.name}</Text>
          <Text>{data.employer.address}</Text>
        </View>

        <View style={styles.body}>
          <Text style={{ marginBottom: 10 }}>Dear Sir/Madam:</Text>
          <Text style={{ marginBottom: 10 }}>This office has arranged for the following applicant to call on you regarding your opening:</Text>
          
          <View style={styles.applicantBox}>
            <View style={styles.row}>
              <Text style={styles.label}>Name:</Text><Text style={styles.value}>{data.applicant.name}</Text>
            </View>
            {data.applicant.nsrpId && <View style={styles.row}><Text style={styles.label}>NSRP ID:</Text><Text style={styles.value}>{data.applicant.nsrpId}</Text></View>}
            {data.applicant.age && <View style={styles.row}><Text style={styles.label}>Age:</Text><Text style={styles.value}>{data.applicant.age}</Text></View>}
            {data.applicant.sex && <View style={styles.row}><Text style={styles.label}>Sex:</Text><Text style={styles.value}>{data.applicant.sex}</Text></View>}
            {data.applicant.contact && <View style={styles.row}><Text style={styles.label}>Contact:</Text><Text style={styles.value}>{data.applicant.contact}</Text></View>}
            {data.applicant.address && <View style={styles.row}><Text style={styles.label}>Address:</Text><Text style={styles.value}>{data.applicant.address}</Text></View>}
            {data.applicant.education && <View style={styles.row}><Text style={styles.label}>Education:</Text><Text style={styles.value}>{data.applicant.education}</Text></View>}
          </View>

          <View style={styles.jobBox}>
            <Text style={styles.jobTitleLabel}>Position Applied For</Text>
            <Text style={styles.jobTitle}>{data.job.title}</Text>
            {data.job.psocCode && <Text style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>PSOC Code: {data.job.psocCode}</Text>}
          </View>

          <Text style={{ marginTop: 10 }}>We would appreciate it very much if you would let us know the status of application of the said applicant. Thank you.</Text>
        </View>

        <Text style={{ marginBottom: 20 }}>Very Truly Yours,</Text>
        
        <View style={styles.signatures}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signName}>LORELIE GERONIMO PACQUIAO</Text>
            <Text style={styles.signTitle}>CITY MAYOR</Text>
            <Text style={{ fontSize: 8, color: '#64748b' }}>By Authority of the City Mayor</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signName}>NURHASAN A. JUANDAY</Text>
            <Text style={styles.signTitle}>SUPERVISING LABOR AND EMPLOYMENT OFFICER</Text>
            <Text style={{ fontSize: 8, color: '#64748b' }}>PESO GENSAN</Text>
          </View>
        </View>

        <View style={styles.stub}>
          <Text style={styles.stubTitle}>✂ Employer Feedback Stub — Please return to PESO Gensan</Text>
          <View style={{ flexDirection: 'row', marginBottom: 5 }}>
            <Text style={{ flex: 1 }}><Text style={{ fontWeight: 'bold' }}>Applicant:</Text> {data.applicant.name}</Text>
            <Text style={{ flex: 1 }}><Text style={{ fontWeight: 'bold' }}>Slip No:</Text> {data.slipNumber}</Text>
          </View>
          <Text style={{ marginBottom: 5 }}>Result: [  ] Hired      [  ] For Interview      [  ] Not Hired</Text>
          <View style={{ flexDirection: 'row' }}>
            <Text style={{ flex: 1 }}>Date: _______________</Text>
            <Text style={{ flex: 1 }}>HR Signature: _______________</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>4th Floor General Santos City Investment Action Center, City Hall Drive, General Santos City, 9500</Text>
          <Text>(083) 533-3479  |  peso_gensan@yahoo.com</Text>
        </View>
      </Page>
    </Document>
  );
};
