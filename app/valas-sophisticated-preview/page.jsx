import fs from 'fs';
import path from 'path';

export default function Page() {
  const filePath = path.join(process.cwd(), 'public', 'valas-sophisticated-preview.html');
  const html = fs.readFileSync(filePath, 'utf8');
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
