@api @users @crud @ddf
Feature: User CRUD operations
  Create, update and delete users. Request payloads and expected results
  are driven by external data files in test-data/ (data-driven testing).

  Background:
    Given the API is targeting the "qa" environment

  Scenario Outline: Create a new user from dataset "<dataset>"
    When I load the dataset "<dataset>" from "users/create-users.json"
    And I send a "POST" request to "/api/users" with the loaded payload
    Then the response status code should be the expected status
    And the response should contain the expected fields
    And the response field "createdAt" should not be empty

    Examples:
      | dataset           |
      | valid_user        |
      | minimal_user      |
      | boundary_long_name |

  Scenario Outline: Update a user from CSV row <row>
    When I load the CSV dataset from row <row> of "users/update-users.csv"
    And I send a "PUT" request to "/api/users/2" with the loaded payload
    Then the response status code should be the expected status
    And the response should contain the expected fields
    And the response field "updatedAt" should not be empty

    Examples:
      | row |
      | 1   |
      | 2   |
      | 3   |

  Scenario: Partially update a user with PATCH
    When I load the dataset "patch_job" from "users/update-users.json"
    And I send a "PATCH" request to "/api/users/2" with the loaded payload
    Then the response status code should be the expected status
    And the response should contain the expected fields

  @smoke
  Scenario: Delete a user
    When I send a "DELETE" request to "/api/users/2"
    Then the response status code should be 204
