import { Body, Document } from '@ahmedrowaihi/pdf-forge-components';

const SimplePdfTemplate = () => {
  return (
    <Document>
      <Body>
        <h1 style={{ color: '#333', fontSize: '24px' }}>Hello from Hono!</h1>
        <p style={{ color: '#666', fontSize: '16px' }}>
          This is a PDF generated using PDF Forge.
        </p>
        <p style={{ color: '#666', fontSize: '16px' }}>
          Generated at: {new Date().toLocaleString()}
        </p>
      </Body>
    </Document>
  );
};

export default SimplePdfTemplate;

export { SimplePdfTemplate };

interface CustomPdfTemplateProps {
  title?: string;
  content?: string;
  name?: string;
}

export const CustomPdfTemplate = ({
  title = 'Document',
  content = 'No content provided',
  name,
}: CustomPdfTemplateProps) => {
  return (
    <Document>
      <Body>
        <h1
          style={{
            color: '#2563eb',
            fontSize: '28px',
            marginBottom: '20px',
          }}
        >
          {title}
        </h1>
        {name && (
          <p style={{ fontSize: '18px', marginBottom: '10px' }}>
            Hello, {name}!
          </p>
        )}
        <p style={{ color: '#666', fontSize: '16px', lineHeight: '1.6' }}>
          {content}
        </p>
        <p style={{ color: '#999', fontSize: '12px', marginTop: '30px' }}>
          Generated: {new Date().toLocaleString()}
        </p>
      </Body>
    </Document>
  );
};
