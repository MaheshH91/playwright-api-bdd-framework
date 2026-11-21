@api @auth @ddf
Feature: Authentication API
  Verify login behaviour for valid and invalid credentials, driven by
  datasets in test-data/auth/login.json, and demonstrate reusing the
  returned token in a follow-up request.

  Background:
    Given the API is targeting the "qa" environment

  Scenario Outline: Login with dataset "<dataset>"
    When I load the dataset "<dataset>" from "auth/login.json"
    And I send a "POST" request to "/api/login" with the loaded payload
    Then the response status code should be the expected status
    And the response should contain the expected fields

    Examples:
      | dataset           |
      | valid_credentials |
      | missing_password  |
      | missing_email     |

  @smoke
  Scenario: Capture the login token and reuse it in a follow-up request
    When I load the dataset "valid_credentials" from "auth/login.json"
    And I send a "POST" request to "/api/login" with the loaded payload
    Then the response status code should be 200
    And I store the response field "token" as "authToken"
    Then the stored variable "authToken" should not be empty
    And I set the "X-Request-Trace" header to "login-{{authToken}}"
    When I send a "GET" request to "/api/users/2"
    Then the response status code should be 200
    And the response time should be below 10000 ms
