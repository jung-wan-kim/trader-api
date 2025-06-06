const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  sort(tests) {
    // 단위 테스트를 먼저 실행하고 통합 테스트를 나중에 실행
    const unitTests = tests.filter(test => !test.path.includes('integration'));
    const integrationTests = tests.filter(test => test.path.includes('integration'));
    
    // 빠른 테스트부터 실행
    const sortedUnitTests = unitTests.sort((a, b) => {
      const aWeight = this.getTestWeight(a.path);
      const bWeight = this.getTestWeight(b.path);
      return aWeight - bWeight;
    });
    
    return [...sortedUnitTests, ...integrationTests];
  }
  
  getTestWeight(path) {
    // 가벼운 테스트부터 실행
    if (path.includes('utils')) return 1;
    if (path.includes('validators')) return 2;
    if (path.includes('middleware')) return 3;
    if (path.includes('services')) return 4;
    if (path.includes('controllers')) return 5;
    return 6;
  }
}

module.exports = CustomSequencer;