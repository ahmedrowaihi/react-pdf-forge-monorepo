export function HomePage() {
  return (
    <html lang="en">
      {/* biome-ignore lint/style/noHeadElement: Valid HTML for Hono app, not Next.js */}
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>PDF Forge Hono Example</title>
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #fafafa;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: #1a1a1a;
          }
          .container {
            background: white;
            border: 1px solid #e5e5e5;
            padding: 60px 40px;
            max-width: 500px;
            width: 100%;
          }
          h1 {
            color: #1a1a1a;
            margin-bottom: 12px;
            font-size: 28px;
            font-weight: 600;
            letter-spacing: -0.5px;
          }
          p {
            color: #666;
            margin-bottom: 40px;
            line-height: 1.6;
            font-size: 15px;
          }
          .section {
            margin-bottom: 32px;
          }
          .section-title {
            color: #1a1a1a;
            font-size: 14px;
            margin-bottom: 12px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .button-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          a.button {
            display: inline-block;
            padding: 12px 20px;
            background: #1a1a1a;
            color: white;
            text-decoration: none;
            text-align: center;
            font-weight: 400;
            font-size: 14px;
            transition: background 0.15s;
            border: 1px solid #1a1a1a;
          }
          a.button:hover {
            background: #333;
          }
          a.button.secondary {
            background: white;
            color: #1a1a1a;
            border-color: #e5e5e5;
          }
          a.button.secondary:hover {
            background: #fafafa;
            border-color: #1a1a1a;
          }
          form {
            margin-top: 20px;
          }
          .form-group {
            margin-bottom: 16px;
          }
          label {
            display: block;
            font-size: 13px;
            color: #666;
            margin-bottom: 6px;
            font-weight: 400;
          }
          input, textarea {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #e5e5e5;
            font-size: 14px;
            font-family: inherit;
            background: white;
            color: #1a1a1a;
          }
          input:focus, textarea:focus {
            outline: none;
            border-color: #1a1a1a;
          }
          textarea {
            resize: vertical;
            min-height: 80px;
          }
          button[type="submit"] {
            width: 100%;
            padding: 12px 20px;
            background: #1a1a1a;
            color: white;
            border: 1px solid #1a1a1a;
            font-size: 14px;
            font-weight: 400;
            cursor: pointer;
            transition: background 0.15s;
            font-family: inherit;
          }
          button[type="submit"]:hover {
            background: #333;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <h1>PDF Forge Hono Example</h1>
          <p>
            Showcase example demonstrating PDF generation and preview
            capabilities
          </p>

          <div className="section">
            <div className="section-title">PDF Generation</div>
            <div className="button-group">
              <a href="/pdf" className="button" download>
                Generate Simple PDF
              </a>
              <a href="/preview" className="button secondary">
                Browse Templates
              </a>
            </div>

            <form action="/pdf" method="POST" target="_blank" rel="noopener">
              <div className="form-group">
                <label htmlFor="title">Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  placeholder="Document Title"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="content">Content</label>
                <textarea
                  id="content"
                  name="content"
                  placeholder="Document content..."
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="name">Name (optional)</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Your name"
                />
              </div>
              <button type="submit">Generate Custom PDF</button>
            </form>
          </div>
        </div>
      </body>
    </html>
  );
}
