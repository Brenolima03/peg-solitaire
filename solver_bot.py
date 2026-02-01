from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

class PegSolitaireBot:
  def __init__(self, driver, wait):
    self.driver = driver
    self.wait = wait

    # Pre-calculated winning sequence
    self.solution = [
      ((3, 5), (3, 3)),
      ((3, 2), (3, 4)),
      ((3, 0), (3, 2)),
      ((5, 3), (3, 3)),
      ((3, 3), (3, 1)),
      ((5, 2), (3, 2)),
      ((4, 0), (4, 2)),
      ((2, 1), (4, 1)),
      ((2, 3), (2, 1)),
      ((2, 0), (2, 2)),
      ((2, 5), (2, 3)),
      ((4, 4), (2, 4)),
      ((2, 3), (2, 5)),
      ((0, 4), (2, 4)),
      ((0, 2), (0, 4)),
      ((4, 6), (4, 4)),
      ((2, 6), (4, 6)),
      ((3, 2), (5, 2)),
      ((1, 2), (3, 2)),
      ((6, 2), (4, 2)),
      ((3, 2), (5, 2)),
      ((6, 4), (6, 2)),
      ((6, 2), (4, 2)),
      ((4, 1), (4, 3)),
      ((4, 3), (4, 5)),
      ((4, 6), (4, 4)),
      ((5, 4), (3, 4)),
      ((3, 4), (1, 4)),
      ((0, 4), (2, 4)),
      ((2, 5), (2, 3)),
      ((1, 3), (3, 3))
    ]

  def coords_to_index(self, row, col):
    """Convert (row, col) to linear index"""
    return row * 7 + col

  def execute_move(self, from_row, from_col, to_row, to_col, move_num):
    """Execute a single move by clicking the board"""
    try:
      # Re-fetch board and cells for each move to avoid stale element reference
      board = self.driver.find_element(By.ID, "board")
      cells = board.find_elements(By.CLASS_NAME, "cell")

      from_idx = self.coords_to_index(from_row, from_col)
      to_idx = self.coords_to_index(to_row, to_col)

      # Click the peg to select it
      from_cell = cells[from_idx]
      peg = from_cell.find_element(By.CLASS_NAME, "peg")
      peg.click()
      time.sleep(0.005)

      # Re-fetch cells again after the click to avoid stale reference
      board = self.driver.find_element(By.ID, "board")
      cells = board.find_elements(By.CLASS_NAME, "cell")

      # Click the target empty cell to move
      to_cell = cells[to_idx]
      empty = to_cell.find_element(By.CLASS_NAME, "empty")
      empty.click()
      time.sleep(0.005)

      return True

    except Exception as e:
      print(f"  Error executing move {move_num}: {e}")
      import traceback
      traceback.print_exc()
      return False

  def play(self):
    """Play the game using the pre-calculated solution"""
    print("=" * 50)
    print("Peg Solitaire Bot - Optimal Solution")
    print("=" * 50)

    # Start the game
    start_btn =\
      self.wait.until(EC.element_to_be_clickable((By.ID, "startButton")))
    start_btn.click()
    time.sleep(0.1)

    # Execute each move in the solution
    for i, (from_pos, to_pos) in enumerate(self.solution, 1):
      from_row, from_col = from_pos
      to_row, to_col = to_pos

      if not self.execute_move(from_row, from_col, to_row, to_col, i):
        print(f"\n✗ Failed to execute move {i}")
        return False

      # Check if game is won
      try:
        message = self.driver.find_element(By.ID, "message").text
        if "venceu!" in message.lower():
          timer = self.driver.find_element(By.ID, "timer").text
          print(f"\n{'=' * 50}")
          print(f"✓ GAME WON! {message}")
          print(f"Time: {timer}")
          print(f"Moves executed: {i}/{len(self.solution)}")
          print("=" * 50)
          return True
      except:
          pass

    # Final check
    final_message = self.driver.find_element(By.ID, "message").text
    final_timer = self.driver.find_element(By.ID, "timer").text

    print(f"\n{'=' * 50}")
    print(f"Final message: {final_message}")
    print(f"Final timer: {final_timer}")
    print("=" * 50)

    return "won" in final_message.lower()

# Main execution
if __name__ == "__main__":
  driver = webdriver.Chrome()

  try:
    # Navigate to the local HTML file
    driver.get("file:///C:/Users/breno/workspace/peg-solitaire/index.html")

    wait = WebDriverWait(driver, 10)

    bot = PegSolitaireBot(driver, wait)
    success = bot.play()

    if success:
      print("\n🎉 SUCCESS! The bot won!")
    else:
      print("\n❌ Something went wrong during gameplay")

    time.sleep(300)

  except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

  finally:
    driver.quit()
