// Simple test to verify Jest setup
describe('Jest Setup', () => {
  it('should be able to run basic tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should support async/await', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  it('should support modern JavaScript features', () => {
    const arr = [1, 2, 3];
    const doubled = arr.map(x => x * 2);
    expect(doubled).toEqual([2, 4, 6]);
  });
});