import path from 'node:path';
import Image from 'next/image';
import Link from 'next/link';
import { Button, Heading, Text } from '../components';
import CodeSnippet from '../components/code-snippet';
import { Shell } from '../components/shell';
import { templatesDirectoryAbsolutePath } from './env';
import logo from './logo.png';

export default function Home() {
  const baseTemplatesDirectoryName = path.basename(
    templatesDirectoryAbsolutePath,
  );

  return (
    <Shell>
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="-mt-10 relative max-w-lg flex flex-col items-center gap-3 text-center">
          <Image
            alt="React PDF Forge Icon"
            className="mb-8"
            height={144}
            src={logo}
            style={{
              borderRadius: 34,
              boxShadow: '0 .625rem 12.5rem 1.25rem #2B7CA080',
            }}
            width={141}
          />
          <Heading as="h2" size="6" weight="medium">
            Welcome to React PDF Forge
          </Heading>
          <Text as="p">
            To start developing your PDF templates, you can create a<br />
            <CodeSnippet>.jsx</CodeSnippet> or <CodeSnippet>.tsx</CodeSnippet>{' '}
            file under your{' '}
            <CodeSnippet>{baseTemplatesDirectoryName}</CodeSnippet> folder.
          </Text>
          <Button asChild className="mt-3" size="3">
            <Link
              href="https://github.com/ahmedrowaihi/react-pdf-forge-monorepo"
              target="_blank"
              rel="noopener noreferrer"
            >
              Check the docs
            </Link>
          </Button>
        </div>
      </div>
    </Shell>
  );
}
