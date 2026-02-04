const ImageProcessor = require('../services/aiAgent/imageProcessor');

describe('ImageProcessor regressions', () => {
  test('explicit image request should override price question (price+images => true)', async () => {
    const aiAgentServiceMock = {
      // Not used in this path (explicit image keywords short-circuit)
      generateAIResponse: jest.fn()
    };
    const ip = new ImageProcessor(aiAgentServiceMock);

    const wantsImages = await ip.isCustomerRequestingImages('بكام؟ ابعتلي صور لو سمحت', [], 'COMP_ANY');
    expect(wantsImages).toBe(true);
  });

  test('extractImagesFromRAGData should not crash if AI returns null (falls back to direct match)', async () => {
    const aiAgentServiceMock = {
      generateAIResponse: jest.fn().mockResolvedValue(null)
    };
    const ip = new ImageProcessor(aiAgentServiceMock);

    const ragData = [
      {
        type: 'product',
        content: 'Test Product',
        metadata: {
          id: 'P1',
          name: 'Test Product',
          images: ['https://example.com/img1.jpg'],
          variants: []
        }
      }
    ];

    const images = await ip.extractImagesFromRAGData(ragData, 'Test Product', 'COMP_ANY');
    expect(Array.isArray(images)).toBe(true);
    expect(images.length).toBeGreaterThan(0);
    expect(images[0]).toHaveProperty('type', 'image');
    expect(images[0]).toHaveProperty('payload');
    expect(images[0].payload).toHaveProperty('url', 'https://example.com/img1.jpg');
  });
});

























