const { RAGService } = require('../services/ragService');

describe('RAGService company product loading behavior', () => {
  let qualityMonitor;

  beforeAll(() => {
    // Get quality monitor instance to cleanup later
    const aiAgentService = require('../services/aiAgentService');
    if (aiAgentService.qualityMonitor) {
      qualityMonitor = aiAgentService.qualityMonitor;
    }
  });

  afterAll(() => {
    // Cleanup quality monitor to prevent memory leaks
    if (qualityMonitor && typeof qualityMonitor.cleanup === 'function') {
      qualityMonitor.cleanup();
    }
  });

  test('loadProductsForCompany should NOT delete other companies products', async () => {
    const rag = new RAGService();
    // Avoid waiting for async initialization
    rag.isInitialized = true;

    // Seed two companies' products in KB
    rag.knowledgeBase.set('product_A1', {
      type: 'product',
      content: 'A product',
      metadata: { id: 'A1', name: 'ProdA', companyId: 'COMP_A' }
    });
    rag.knowledgeBase.set('product_B1', {
      type: 'product',
      content: 'B product',
      metadata: { id: 'B1', name: 'ProdB', companyId: 'COMP_B' }
    });

    // Stub DB load to only "add" one product for COMP_A
    const loadSpy = jest
      .spyOn(rag, 'loadProducts')
      .mockImplementation(async (companyId) => {
        rag.knowledgeBase.set(`product_${companyId}_X`, {
          type: 'product',
          content: 'New product',
          metadata: { id: `${companyId}_X`, name: `New_${companyId}`, companyId }
        });
      });

    await rag.loadProductsForCompany('COMP_A');

    expect(loadSpy).toHaveBeenCalledTimes(1);
    // Company B product must still exist
    expect(
      Array.from(rag.knowledgeBase.values()).some(
        (v) => v?.type === 'product' && v?.metadata?.companyId === 'COMP_B' && v?.metadata?.name === 'ProdB'
      )
    ).toBe(true);
  });

  test('loadProductsForCompany should cache loads for a short TTL', async () => {
    const rag = new RAGService();
    rag.isInitialized = true;

    const loadSpy = jest.spyOn(rag, 'loadProducts').mockResolvedValue(undefined);

    await rag.loadProductsForCompany('COMP_X');
    await rag.loadProductsForCompany('COMP_X');

    expect(loadSpy).toHaveBeenCalledTimes(1);
  });

  test('retrieveRelevantData should ensure company products are loaded even for greeting intent', async () => {
    const rag = new RAGService();
    rag.isInitialized = true;
    jest.spyOn(rag, 'ensureInitialized').mockResolvedValue(true);

    const loadCompanySpy = jest.spyOn(rag, 'loadProductsForCompany').mockResolvedValue(undefined);
    jest.spyOn(rag, 'generalSearch').mockResolvedValue([]);

    await rag.retrieveRelevantData('اهلا عندك ايه', 'greeting', null, 'COMP_Z');

    expect(loadCompanySpy).toHaveBeenCalledWith('COMP_Z');
  });
});


