export class EloSystem {
  private kFactor: number;

  constructor(kFactor: number = 32) {
    this.kFactor = kFactor;
  }

  private expectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  calculateNewRatings(
    ratingA: number,
    ratingB: number,
    result: 'a_wins' | 'b_wins' | 'draw'
  ): { newRatingA: number; newRatingB: number } {
    const expectedA = this.expectedScore(ratingA, ratingB);
    const expectedB = this.expectedScore(ratingB, ratingA);

    let actualA: number, actualB: number;

    if (result === 'a_wins') {
      actualA = 1;
      actualB = 0;
    } else if (result === 'b_wins') {
      actualA = 0;
      actualB = 1;
    } else {
      actualA = 0.5;
      actualB = 0.5;
    }

    const newRatingA = Math.round(ratingA + this.kFactor * (actualA - expectedA));
    const newRatingB = Math.round(ratingB + this.kFactor * (actualB - expectedB));

    return { newRatingA, newRatingB };
  }
}