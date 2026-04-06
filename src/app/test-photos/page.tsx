import Image from 'next/image'

const TEST_URL = 'https://d19qeljo1i8r7y.cloudfront.net/images/room/c82785f4-27b9-4f66-9a0d-8aa60f040078.jpg'

export default function TestPhotosPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 space-y-12">
      <h1 className="text-2xl font-bold" style={{ color: '#2D3038' }}>Photo Quality Test</h1>
      <p className="text-sm" style={{ color: '#6B7280' }}>Source: 1600x1200 JPEG, 186KB from CloudFront CDN</p>

      <div className="space-y-8">
        {/* Test 1 */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Test 1: Raw &lt;img&gt; tag, max-width 500px</h2>
          <img src={TEST_URL} style={{ maxWidth: '500px', display: 'block' }} alt="Raw img tag" />
        </div>

        {/* Test 2 */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Test 2: Next.js Image, unoptimized=true, 500x375</h2>
          <Image src={TEST_URL} width={500} height={375} unoptimized alt="Next.js unoptimized" />
        </div>

        {/* Test 3 */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Test 3: Next.js Image, default optimization, 500x375</h2>
          <Image src={TEST_URL} width={500} height={375} alt="Next.js optimized" />
        </div>

        {/* Test 4 */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Test 4: Raw &lt;img&gt; at natural resolution (no constraints)</h2>
          <img src={TEST_URL} alt="Raw natural size" />
        </div>

        {/* Test 5: fill mode like our gallery uses */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Test 5: Next.js Image fill mode in 500x375 container (how gallery renders)</h2>
          <div className="relative overflow-hidden rounded-xl" style={{ width: '500px', height: '375px' }}>
            <Image src={TEST_URL} fill unoptimized className="object-cover" sizes="500px" alt="Fill mode unoptimized" />
          </div>
        </div>

        {/* Test 6: fill mode with Vercel optimization */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Test 6: Next.js Image fill mode with Vercel optimization (quality 85)</h2>
          <div className="relative overflow-hidden rounded-xl" style={{ width: '500px', height: '375px' }}>
            <Image src={TEST_URL} fill className="object-cover" sizes="500px" quality={85} alt="Fill mode optimized" />
          </div>
        </div>
      </div>
    </div>
  )
}
